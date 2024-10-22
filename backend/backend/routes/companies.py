import math
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import database

router = APIRouter(
    prefix="/companies",
    tags=["companies"],
)

class CompanyOutput(BaseModel):
    id: int
    company_name: str
    liked: bool

class CompanyBatchOutput(BaseModel):
    companies: list[CompanyOutput]
    total: int

class MoveCompanyInput(BaseModel):
    company_id: int
    source_collection: str
    target_collection: str

class MoveMultCompaniesInput(BaseModel):
    company_ids: list[int]
    source_collection: str
    target_collection: str

def fetch_companies_with_liked(
    db: Session, company_ids: list[int]
) -> list[CompanyOutput]:
    liked_list = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Liked Companies")
        .first()
    )

    liked_associations = (
        db.query(database.CompanyCollectionAssociation)
        .filter(database.Company.id.in_(company_ids))
        .filter(
            database.CompanyCollectionAssociation.collection_id == liked_list.id,
        )
        .all()
    )

    liked_companies = {association.company_id for association in liked_associations}

    companies = (
        db.query(database.Company).filter(database.Company.id.in_(company_ids)).all()
    )

    results = [(company, company.id in liked_companies) for company in companies]

    return [
        CompanyOutput(
            id=company.id,
            company_name=company.company_name,
            liked=True if liked else False,
        )
        for company, liked in results
    ]


@router.get("", response_model=CompanyBatchOutput)
def get_companies(
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    db: Session = Depends(database.get_db),
):
    results = db.query(database.Company).offset(offset).limit(limit).all()

    count = db.query(database.Company).count()
    companies = fetch_companies_with_liked(db, [company.id for company in results])

    return CompanyBatchOutput(
        companies=companies,
        total=count,
    )

@router.post("/move")
def move_company(
    payload:MoveCompanyInput,
    db: Session = Depends(database.get_db),
):
    source_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.id == payload.source_collection)
        .first()
    )

    if not source_collection:
        raise HTTPException(status_code=404, detail="Source collection not found")

    target_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.id == payload.target_collection)
        .first()
    )

    if not target_collection:
        raise HTTPException(status_code=404, detail="Target collection not found")

    company_in_source = (
        db.query(database.CompanyCollectionAssociation)
        .filter(database.CompanyCollectionAssociation.collection_id == source_collection.id)
        .filter(database.CompanyCollectionAssociation.company_id == payload.company_id)
        .first()
    )

    if not company_in_source:
        raise HTTPException(status_code=404, detail="Company not found in Source collection")

    company_in_target= (
        db.query(database.CompanyCollectionAssociation)
        .filter(database.CompanyCollectionAssociation.collection_id == target_collection.id)
        .filter(database.CompanyCollectionAssociation.company_id == payload.company_id)
        .first()
    )

    if company_in_target:
        return {"status": "exists", "message": f"Company already exists in {payload.target_collection}"}

    new_entry = database.CompanyCollectionAssociation(
        company_id = payload.company_id,
        collection_id=target_collection.id
    )

    db.add(new_entry)
    db.commit()

    return {"status": "success", "message": f"Company moved from {payload.source_collection} to {payload.target_collection}"}

def process_company_chunk(job_id: str, chunk: list, target_collection_id: int, db: Session):
    companies_in_target =(
        db.query(database.CompanyCollectionAssociation) 
        .filter(database.CompanyCollectionAssociation.collection_id == target_collection_id) 
        .filter(database.CompanyCollectionAssociation.company_id.in_(chunk)) 
        .all()
    ) 

    existing_company_ids = set(map(lambda association: association.company_id, companies_in_target))
    companies_to_add = list(filter(lambda company_id: company_id not in existing_company_ids, chunk))

    for company_id in companies_to_add:
        new_entry = database.CompanyCollectionAssociation(
            company_id=company_id,
            collection_id=target_collection_id
        )
        db.add(new_entry)

    db.commit()

@router.post("/moveMultiple")
def move_mult_companies(
    payload:MoveMultCompaniesInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    target_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.id == payload.target_collection)
        .first()
    )

    if not target_collection:
        raise HTTPException(status_code=404, detail="Target collection not found")

    chunk_size = 100
    num_companies = len(payload.company_ids)
    chunks = math.ceil(num_companies/chunk_size)

    for i in range(chunks):
        chunk = payload.company_ids[i * chunk_size : (i + 1) * chunk_size]
        background_tasks.add_task(process_company_chunk, job_id ,chunk, target_collection.id, db)

    return {"status": "success", "message": "Move multiple initiated."}


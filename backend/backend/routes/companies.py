import uuid
import math
import os
import json
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse 
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.future import select
import asyncio
from fastapi.concurrency import run_in_threadpool
import redis.asyncio as aioredis
from backend.db import database


router = APIRouter(
    prefix="/companies",
    tags=["companies"],
)

jobs = {}

semaphore = asyncio.Semaphore(5)  

class CompanyOutput(BaseModel):
    id: int
    company_name: str
    liked: bool

class CompanyBatchOutput(BaseModel):
    companies: list[CompanyOutput]
    total: int

class MoveMultCompaniesInput(BaseModel):
    company_ids: list[int]
    source_collection: str
    target_collection: str

class MoveAllCompaniesInput(BaseModel):
    source_collection: str
    target_collection: str

class MoveMultCompaniesOutput(BaseModel):
    job_id: str
    message: str

class JobStatusOutput(BaseModel):
    status: str
    chunks_processed: int
    chunks: int


class CompanyCollectionMetadata(BaseModel):
    id: uuid.UUID
    collection_name: str


class CompanyCollectionOutput(CompanyBatchOutput, CompanyCollectionMetadata):
    pass

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


@router.get("", response_model = CompanyBatchOutput)
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

def get_collection_by_id(collectionId: str, db: Session) -> str:
    target_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.id == collectionId)
        .first()
    );
    return target_collection

def get_companies_by_collection_id(collectionId: str, db: Session):
    companies = (
        db.query(database.CompanyCollectionAssociation.company_id)
        .filter(database.CompanyCollectionAssociation.collection_id == collectionId)
        .all()
    );
    return companies

def create_job(job_id: str, chunks: int) -> str:
    jobs[job_id] = {
        "status": "in_progress",
        "chunks_processed": 0,
        "chunks": chunks,
    }
    return job_id

def update_job_progress(job_id: str):
    if job_id in jobs:
        jobs[job_id]["chunks_processed"] += 1
        if jobs[job_id]["chunks_processed"] >= jobs[job_id]["chunks"]:
            jobs[job_id]["status"] = "completed"

async def process_company_chunk_with_limit(job_id: str, chunk: list, target_collection_id: int, db: Session, redis: aioredis.Redis):
    async with semaphore:  
        await process_company_chunk(job_id, chunk, target_collection_id, db, redis)

async def create_company_chunking_job(chunk_size, company_ids, target_collection, db, background_tasks: BackgroundTasks,redis: aioredis.Redis) -> str:
    job_id = str(uuid.uuid4())
    num_companies = len(company_ids)
    chunks = math.ceil(num_companies / chunk_size)

    create_job(job_id, chunks)

    for i in range(chunks):
        chunk = company_ids[i * chunk_size: (i + 1) * chunk_size]
        background_tasks.add_task(process_company_chunk_with_limit, job_id, chunk, target_collection, db,redis)

    return job_id

async def process_company_chunk(job_id: str, chunk: list, target_collection_id: int, db: Session, redis: aioredis.Redis):
    companies_in_target = db.execute(
        select(database.CompanyCollectionAssociation.company_id)
        .filter(database.CompanyCollectionAssociation.collection_id == target_collection_id)
    ).scalars().all()

    existing_company_ids = set(companies_in_target)
    companies_to_add = [company_id for company_id in chunk if company_id not in existing_company_ids]

    new_entries = [
        database.CompanyCollectionAssociation(company_id=company_id, collection_id=target_collection_id)
        for company_id in companies_to_add
    ]

    def addAndCommit(new_entries):
        db.add_all(new_entries)
        db.commit()

    await run_in_threadpool(lambda: addAndCommit(new_entries))

    await getAllCompaniesForCache(db,target_collection_id,redis)

    update_job_progress(job_id)

@router.post("/moveMultiple")
async def move_mult_companies(
    payload: MoveMultCompaniesInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    redis: aioredis.Redis = Depends(database.get_redis)
):
    target_collection = get_collection_by_id(payload.target_collection,db)
    if not target_collection:
        raise HTTPException(status_code=404, detail="Target collection not found")

    source_collection = get_collection_by_id(payload.source_collection,db)
    if not source_collection:
        raise HTTPException(status_code=404, detail="Source collection not found")

    job_id = await create_company_chunking_job(10,payload.company_ids,payload.target_collection,db,background_tasks,redis)

    return MoveMultCompaniesOutput(
        job_id = job_id,
        message = "Move company job initiated"
    )

@router.post("/moveAll")
async def move_all_companies(
    payload: MoveAllCompaniesInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    redis: aioredis.Redis = Depends(database.get_redis)
):
    target_collection = get_collection_by_id(payload.target_collection,db)
    if not target_collection:
        raise HTTPException(status_code=404, detail="Target collection not found")

    source_collection = get_collection_by_id(payload.source_collection,db)
    if not source_collection:
        raise HTTPException(status_code=404, detail="Source collection not found")

    companies_in_source = get_companies_by_collection_id(payload.source_collection,db)
    if not companies_in_source:
        raise HTTPException(status_code=404, detail="No companies found in the source collection")

    company_ids = [company.company_id for company in companies_in_source]

    job_id = await create_company_chunking_job(500,company_ids,payload.target_collection,db,background_tasks,redis)

    return MoveMultCompaniesOutput(
        job_id = job_id,
        message = "Move ALL job initiated"
    )

@router.get("/job-status/{job_id}")
async def get_job_status(
    job_id:str
):
    if job_id not in jobs:
        raise HTTPException(status_code = 404, detail="Job not found")

    async def event_stream():
        while jobs[job_id]["status"] != "completed":    
            progress_output = JobStatusOutput(
                status = jobs[job_id]["status"],
                chunks_processed = jobs[job_id]["chunks_processed"],
                chunks = jobs[job_id]["chunks"]
            )
            yield f"data: {progress_output.json()}\n\n"
            await asyncio.sleep(2)

        completed_output = JobStatusOutput(
            status = "completed",
            chunks_processed = jobs[job_id]["chunks"],
            chunks = jobs[job_id]["chunks"]
        )
        yield f"data: {completed_output.json()}\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")

    
async def getAllCompaniesForCache(db,collection_id,redis):
    query = (
        db.query(database.CompanyCollectionAssociation, database.Company)
        .join(database.Company)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
    )
    def company_to_dict(company):
        return {
            "id": company.id,
            "name": company.company_name,
    }
    all_results = query.all()
    all_companies = [company_to_dict(company) for _, company in all_results]
    await cache_companies(redis,all_companies,collection_id)
    return all_companies


async def cache_companies(
    redis:aioredis.Redis,
    companies: list[CompanyOutput],
    collection_id: str,
):
    cache_key = str(collection_id)
    
    companies_json = json.dumps(companies)
    
    await redis.set(cache_key, companies_json)
    
    return {"message": f"Companies cached successfully for {collection_id}"}


@router.delete("/flush_redis")
async def flush_redis(redis=Depends(database.get_redis)):
    await redis.flushall()
    return {"message": "All keys deleted from Redis"}

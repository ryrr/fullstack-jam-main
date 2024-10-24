import uuid
import os
import json
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import database
from backend.routes.companies import (
    CompanyBatchOutput,
    fetch_companies_with_liked,
    CompanyCollectionMetadata,
    CompanyCollectionOutput,
    CompanyOutput
)

router = APIRouter(
    prefix="/collections",
    tags=["collections"],
)


@router.get("", response_model=list[CompanyCollectionMetadata])
def get_all_collection_metadata(
    db: Session = Depends(database.get_db),
):
    collections = db.query(database.CompanyCollection).all()

    return [
        CompanyCollectionMetadata(
            id=collection.id,
            collection_name=collection.collection_name,
        )
        for collection in collections
    ]


@router.get("/{collection_id}", response_model=CompanyCollectionOutput)
async def get_company_collection_by_id(
    collection_id: uuid.UUID,
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    db: Session = Depends(database.get_db),
    redis: aioredis.Redis = Depends(database.get_redis)
):
    cached = await get_cached_companies(redis,collection_id)

    all_companies = []

    if 'companies' in cached and cached['companies']:
        print('GETTING DATA FROM CACHE')
        all_companies = cached['companies'] 
    else:
        all_companies = await getAllCompaniesForCache(db,collection_id,redis)

    total_count = len(all_companies)
    results = all_companies[offset:offset + limit]
    companies = fetch_companies_with_liked(db, [company['id'] for company in results])
    result =  CompanyCollectionOutput(
        id=collection_id,
        collection_name=db.query(database.CompanyCollection)
        .get(collection_id)
        .collection_name,
        companies=companies,
        total=total_count,
    )
    return result


    
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

async def get_cached_companies(
    redis:aioredis.Redis,
    collection_id: str,
):
    cache_key = str(collection_id)
    
    try:
        companies_json = await redis.get(cache_key)
        if companies_json is None:
            return {"message": f"No companies found in cache for {collection_id}"}
        companies = json.loads(companies_json)
        return {"companies": companies}

    except Exception as e:
        return {"error": str(e)}


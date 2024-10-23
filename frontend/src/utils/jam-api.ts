import axios from 'axios';

export interface ICompany {
    id: number;
    company_name: string;
    liked: boolean;
}

export interface ICollection {
    id: string;
    collection_name: string;
    companies: ICompany[];
    total: number;
}

export interface ICompanyBatchResponse {
    companies: ICompany[];
}

export interface IMoveCompaniesResponse{
    job_id:string
    message:string
}

const BASE_URL = 'http://localhost:8000';

export async function getCompanies(offset?: number, limit?: number): Promise<ICompanyBatchResponse> {
    try {
        const response = await axios.get(`${BASE_URL}/companies`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsById(id: string, offset?: number, limit?: number): Promise<ICollection> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/${id}`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsMetadata(): Promise<ICollection[]> {
    try {
        const response = await axios.get(`${BASE_URL}/collections`);
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function moveCompanies(ids : number[], sourceCollection : string, targetCollection : string): Promise<IMoveCompaniesResponse> {
    const payload = {
        company_ids:ids,
        source_collection:sourceCollection,
        target_collection:targetCollection
    }
    try {
        const response = await axios.post(`${BASE_URL}/companies/moveMultiple`,payload);
        return response.data;
    } catch (error) {
        console.error('Error moving companies:', error);
        throw error;
    }
}

export async function moveAllCompanies(sourceCollection : string, targetCollection : string): Promise<IMoveCompaniesResponse> {
    const payload = {
        source_collection:sourceCollection,
        target_collection:targetCollection
    }
    try {
        const response = await axios.post(`${BASE_URL}/companies/moveAll`,payload);
        return response.data;
    } catch (error) {
        console.error('Error moving companies:', error);
        throw error;
    }
}

export async function getJobStatusListener(jobId : string): Promise<any> {
    try {
        const response = await axios.get(`${BASE_URL}/companies/job-status/${jobId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching job:', error);
        throw error;
    }
}

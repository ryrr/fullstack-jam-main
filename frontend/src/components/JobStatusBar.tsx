import { getJobStatusListener, IJob,} from "../utils/jam-api";
import {useState , useEffect} from 'react'
interface JobStatusBarProps {
    job:IJob
    setActiveJobs : React.Dispatch<React.SetStateAction<IJob[]>>
    activeJobs: IJob[]
    getCollectionName:(collectionId:string) => string
}
const JobStatusBar:React.FC<JobStatusBarProps> = ({ job,setActiveJobs,activeJobs,getCollectionName })  => {
    const [loadingFraction,setLoadingFraction] = useState(0)
    useEffect(() => {
        if (job) {
            const eventSource = new EventSource(`http://localhost:8000/companies/job-status/${job.job_id}`);
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data); 
                if(data.status === 'in_progress'){
                    let curLoadingFraction = Math.floor((data.chunks_processed/data.chunks)*100)
                    if(curLoadingFraction !== loadingFraction) setLoadingFraction(curLoadingFraction)
                }
                else if (data.status === 'completed') {
                    setLoadingFraction(100)
                    eventSource.close();
                    setTimeout(()=>{
                        let newJobs = activeJobs.filter((activeJob)=> activeJob.job_id !== job.job_id)
                        setActiveJobs(newJobs)
                    },500)
                }
            };
            return () => {
                eventSource.close();
            };
        }
    }, [job]); 
    return(
        <div className='mt-2'>
            <span className='mt-4'>Moving Companies...</span>
            <div >
                <label>{getCollectionName(job.source_collection_id)} {'-->'} {getCollectionName(job.target_collection_id)}</label>
                <progress value={loadingFraction} max="100" style={{ width: '100%', height: '20px'}} />
                <span>{loadingFraction}%</span>
            </div>
        </div>
    )
}
export default JobStatusBar
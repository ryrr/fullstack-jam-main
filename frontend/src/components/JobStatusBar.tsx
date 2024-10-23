import { IJob } from "../utils/jam-api";
import {useState , useEffect} from 'react'
interface JobStatusBarProps {
    job:IJob
    setJobs : React.Dispatch<React.SetStateAction<IJob[]>>
    jobs: IJob[]
    getCollectionName:(collectionId:string) => string
}
const JobStatusBar:React.FC<JobStatusBarProps> = ({ job,setJobs,jobs,getCollectionName })  => {
    const [loadingFraction,setLoadingFraction] = useState(0)
    let jobLabel = `${getCollectionName(job.source_collection_id)} ➡️ ${getCollectionName(job.target_collection_id)}`
    useEffect(() => {
        if (job.running) {
            const eventSource = new EventSource(`http://localhost:8000/companies/job-status/${job.job_id}`);
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data); 
                console.log(data)
                if(data.status === 'in_progress'){
                    let curLoadingFraction = Math.floor((data.chunks_processed/data.chunks)*100)
                    if(curLoadingFraction !== loadingFraction) setLoadingFraction(curLoadingFraction)
                }
                else if (data.status === 'completed') {
                    setLoadingFraction(100)
                    eventSource.close();
                    setTimeout(()=>{
                        let newJobs = jobs.map((activeJob) => {
                            if (activeJob.job_id === job.job_id) {
                                return {...activeJob, running: false };
                            }
                            return activeJob; 
                        });
                        setJobs(newJobs)
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
            {
            job.running ?
            <>
                <span className='mt-4'>moving 🦫</span>
                <div>
                    <label>{jobLabel}</label>
                    <progress value={loadingFraction} max="100" style={{ width: '100%', height: '20px'}} />
                    <span>{loadingFraction}%</span>
                </div>
            </>:<>
                <span className='mt-4'>Finished ✅</span>
                <div>
                    <label>{jobLabel}</label>
                </div>
            </>
            }
        </div>
    )
}
export default JobStatusBar
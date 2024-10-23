import { getJobStatusListener,} from "../utils/jam-api";
import {useState , useEffect} from 'react'
interface JobStatusBarProps {
    jobId:string
    setActiveJobs : React.Dispatch<React.SetStateAction<string[]>>
    activeJobs: string[]
}
const JobStatusBar:React.FC<JobStatusBarProps> = ({ jobId,setActiveJobs,activeJobs })  => {
    const [loadingFraction,setLoadingFraction] = useState(0)
    useEffect(() => {
        if (jobId) {
            const eventSource = new EventSource(`http://localhost:8000/companies/job-status/${jobId}`);
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
                        let newJobs = activeJobs.filter((activeId)=> activeId !== jobId)
                        setActiveJobs(newJobs)
                    },500)
                }
            };
            return () => {
                eventSource.close();
            };
        }
    }, [jobId]); 
    return(
        <div>
            <span>Job ID: {jobId}</span>
            <div style={{ marginTop: '20px' }}>
                <label>Progress:</label>
                <progress value={loadingFraction} max="100" style={{ width: '100%', height: '20px',color:'orange' }} />
                <span>{loadingFraction}%</span>
            </div>
        </div>
    )
}
export default JobStatusBar
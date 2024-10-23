import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import CompanyTable from "./components/CompanyTable";
import MoveItemsWidget from "./components/MoveItemsWidget"
import JobStatusBar from "./components/JobStatusBar"
import { getCollectionsMetadata, moveCompanies,moveAllCompanies,MoveType,IJob} from "./utils/jam-api";
import useApi from "./utils/useApi";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

function App() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [selectionModels, setSelectionModels] = useState<{ [key: string]: GridRowSelectionModel }>({});
  const [jobs,setJobs] = useState<IJob[]>([])
  const { data: collectionResponse } = useApi(() => getCollectionsMetadata());
  
  useEffect(() => {
    setSelectedCollectionId(collectionResponse?.[0]?.id);
  }, [collectionResponse]);

  const clearSelection = () => {
    setSelectionModels((prevSelectionModels) => ({
      ...prevSelectionModels,
      [selectedCollectionId]: [],
    }));
  }

  const setJobAsActive = (job_id:string,source_collection:string,targetCollection:string) => {
    let newJob = {
      job_id:job_id,
      source_collection_id:source_collection,
      target_collection_id:targetCollection,
      running:true
    }
    setJobs([...jobs,newJob])
  }

  const getCollectionName = (collectionId:string) => {
    let foundCollectionName = collectionResponse.find((collection) => collection.id === collectionId).collection_name
    return foundCollectionName
  }

  const moveItems = (targetCollection : string, moveType : MoveType) : void => {
    const sourceCollection = selectedCollectionId
    const idsToMove = selectionModels[selectedCollectionId]
    switch (moveType) {
      case MoveType.ALL:
        moveAllCompanies(sourceCollection, targetCollection).then((res)=>{
          setJobAsActive(res.job_id,sourceCollection,targetCollection)
        })
        break;
      case MoveType.SELECTED:
        moveCompanies(idsToMove as number[], sourceCollection, targetCollection).then((res)=>{
          setJobAsActive(res.job_id,sourceCollection,targetCollection)
        })
        break;
      default:
          console.log("Invalid move type");
    }
    clearSelection()
  }


  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="mx-8">
        <div className="font-bold text-xl border-b p-2 mb-4 text-left">
          Harmonic Jam
        </div>
        <div className="flex">
          <div className="w-1/5">
            <p className=" font-bold border-b pb-2">Collections</p>
            <div className="flex flex-col gap-2">
              {collectionResponse?.map((collection) => {
                return (
                  <div
                    key={collection.id}
                    className={`py-1 hover:cursor-pointer hover:bg-orange-300 ${
                      selectedCollectionId === collection.id &&
                      "bg-orange-500 font-bold"
                    }`}
                    onClick={() => {
                      setSelectedCollectionId(collection.id);
                    }}
                  >
                    {collection.collection_name}
                  </div>
                );
              })}
              <p className=" font-bold border-b pb-2 mt-5">Jobs</p>
              {jobs.map((job)=> <JobStatusBar key={job.job_id}{...{ job,setJobs,jobs,getCollectionName}}></JobStatusBar>)}
            </div>
          </div>
          <div className="w-4/5 ml-4">
            <MoveItemsWidget {...{ selectedCollectionId, collectionResponse,moveItems,getCollectionName }} ></MoveItemsWidget>
            {selectedCollectionId && (
              <CompanyTable {...{ selectedCollectionId, setSelectionModels, selectionModels}}/>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;

import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import CompanyTable from "./components/CompanyTable";
import MoveItemsWidget from "./components/MoveItemsWidget"
import JobStatusBar from "./components/JobStatusBar"
import { getCollectionsMetadata, moveCompanies,moveAllCompanies} from "./utils/jam-api";
import useApi from "./utils/useApi";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

function App() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [selectionModels, setSelectionModels] = useState<{ [key: string]: GridRowSelectionModel }>({});
  const [activeJobs,setActiveJobs] = useState<string[]>([])
  const { data: collectionResponse } = useApi(() => getCollectionsMetadata());
  
  useEffect(() => {
    setSelectedCollectionId(collectionResponse?.[0]?.id);
  }, [collectionResponse]);

  const moveItems = (targetCollection : string, moveType : string) : void => {
    const sourceCollection = selectedCollectionId
    const idsToMove = selectionModels[selectedCollectionId]
    //perhaps use the useAPI thing here
    if(moveType === 'ALL'){
      moveAllCompanies(sourceCollection, targetCollection).then((res)=>{
        setActiveJobs([...activeJobs,res.job_id])
      })
    }else{
      moveCompanies(idsToMove as number[], sourceCollection, targetCollection).then((res)=>{
        setActiveJobs([...activeJobs,res.job_id])
      })
    }
    setSelectionModels((prevSelectionModels) => ({
      ...prevSelectionModels,
      [selectedCollectionId]: [],
    }));
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
              {activeJobs.map((jobId)=> <JobStatusBar {...{ jobId,setActiveJobs,activeJobs }}></JobStatusBar>)}
            </div>
          </div>
          <div className="w-4/5 ml-4">
            <MoveItemsWidget {...{ selectedCollectionId, collectionResponse,moveItems }} ></MoveItemsWidget>
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

import { DataGrid, GridRowSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany } from "../utils/jam-api";
import React from "react";
interface CompanyTableProps{
  selectedCollectionId: string
  selectionModels:{ [key: string]: GridRowSelectionModel }
  setSelectionModels:React.Dispatch<React.SetStateAction<{ [key: string]: GridRowSelectionModel }>>
}
const CompanyTable:React.FC<CompanyTableProps> = ({ selectedCollectionId, selectionModels,setSelectionModels }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);


  useEffect(() => {
    getCollectionsById(selectedCollectionId, offset, pageSize).then(
      (newResponse) => {
        setResponse(newResponse.companies);
        setTotal(newResponse.total);
      }
    );
  }, [selectedCollectionId, offset, pageSize]);

  useEffect(() => {
    setOffset(0);
  }, [selectedCollectionId]);

  const handleSelectionChange = (newSelectionModel: GridRowSelectionModel) => {
    setSelectionModels((prevSelectionModels) => ({
      ...prevSelectionModels,
      [selectedCollectionId]: newSelectionModel,
    }));
  };

  return (
    <div style={{ height: 800, width: "100%" }}>
      <DataGrid
        rows={response}
        rowHeight={30}
        columns={[
          { field: "liked", headerName: "Liked", width: 90 },
          { field: "id", headerName: "ID", width: 90 },
          { field: "company_name", headerName: "Company Name", width: 200 },
        ]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
        }}
        rowCount={total}
        pagination
        checkboxSelection
        paginationMode='server'
        onPaginationModelChange={(newMeta) => {
          setPageSize(newMeta.pageSize);
          setOffset(newMeta.page * newMeta.pageSize);
        }}
        keepNonExistentRowsSelected
        rowSelectionModel={selectionModels[selectedCollectionId] || []}
        onRowSelectionModelChange={handleSelectionChange}   
      />
    </div>
  );
};

export default CompanyTable;

import { useState } from "react"

interface MoveItemsWidgetProps {
    selectedCollectionId:string
    collectionResponse:any
    moveItems:(targetCollection : string) => void
}
const MoveItemsWidget:React.FC<MoveItemsWidgetProps> = ({ selectedCollectionId, collectionResponse, moveItems })  => {
    let collectionName = selectedCollectionId ? collectionResponse.find((collection) => collection.id === selectedCollectionId).collection_name : ''
    let targetCollections = selectedCollectionId ? collectionResponse?.filter((collection)=>collection.id !== selectedCollectionId):[]
    const [targetCollectionId,setTargetCollectionId] = useState<string>(targetCollections[0])

    return(
        <div className='flex justify-between items-center'>
            <div>
                <button onClick={()=>{moveItems(targetCollectionId)}}>MOVE</button>
                <select className='font-bold'>
                    <option>SELECTED</option>
                    <option>ALL</option>
                </select>
            </div>
            <div>
                <span>FROM:  </span>
                <span><b>{collectionName}</b></span>
            </div>
            <div>
                <span>TO:  </span>
                <select className='font-bold' onChange={(e)=>{setTargetCollectionId(e.target.value)}}>
                    {targetCollections.map((collection)=>{
                        return(
                            <option value={collection.id}>{collection.collection_name}</option>
                        )
                    })}
                </select>
            </div>
        </div>
    )
}
export default MoveItemsWidget
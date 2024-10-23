import { useState, useEffect } from "react"
import { ICollection } from "../utils/jam-api"

interface MoveItemsWidgetProps {
    selectedCollectionId:string
    collectionResponse:ICollection[]
    moveItems:(targetCollectionId : string, moveType : string) => void
}
const MoveItemsWidget:React.FC<MoveItemsWidgetProps> = ({ selectedCollectionId, collectionResponse, moveItems })  => {
    let selectedCollectionName : string = selectedCollectionId ? collectionResponse.find((collection) => collection.id === selectedCollectionId).collection_name : ''
    let validTargets : ICollection[] = selectedCollectionId ? collectionResponse?.filter((collection)=>collection.id !== selectedCollectionId):[]
    const [targetCollection,setTargetCollection] = useState<ICollection>(validTargets[0])
    const [moveType,setMoveType] = useState<string>('SELECTED')

    useEffect(() => {
        setTargetCollection(validTargets[0])
    }, [selectedCollectionId])

    return(
        <div className='flex justify-between items-center'>
            <div>
                <button onClick={()=>{moveItems(targetCollection.id,moveType)}}>MOVE</button>
                <select className='font-bold' onChange={(e)=>{setMoveType(e.target.value)}}>
                    <option value='SELECTED'>SELECTED</option>
                    <option value='ALL'>ALL</option>
                </select>
            </div>
            <div>
                <span>FROM:  </span>
                <span><b>{selectedCollectionName}</b></span>
            </div>
            <div>
                <span>TO:  </span>
                <select className='font-bold' onChange={(e)=>{setTargetCollection(JSON.parse(e.target.value))}}>
                    {validTargets.map((collection)=>{
                        return(
                            <option value={JSON.stringify(collection)}>{collection.collection_name}</option>
                        )
                    })}
                </select>
            </div>
        </div>
    )
}
export default MoveItemsWidget
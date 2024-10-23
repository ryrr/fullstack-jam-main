import { useState, useEffect } from "react"
import { ICollection , MoveType} from "../utils/jam-api"

interface MoveItemsWidgetProps {
    selectedCollectionId:string
    collectionResponse:ICollection[]
    moveItems:(targetCollectionId : string, moveType : string) => void
    getCollectionName:(collectionId:string) => string
}
const MoveItemsWidget:React.FC<MoveItemsWidgetProps> = ({ selectedCollectionId, collectionResponse, moveItems,getCollectionName })  => {
    let selectedCollectionName : string = selectedCollectionId ? getCollectionName(selectedCollectionId) : ''
    let validTargets : ICollection[] = selectedCollectionId ? collectionResponse?.filter((collection)=>collection.id !== selectedCollectionId):[]
    const [targetCollection,setTargetCollection] = useState<ICollection>(validTargets[0])
    const [moveType,setMoveType] = useState<string>('SELECTED')

    useEffect(() => {
        setTargetCollection(validTargets[0])
    }, [selectedCollectionId])

    return(
        <div className='flex justify-between items-center'>
            <div>
                <button className='bg-orange-500 mr-10' onClick={()=>{moveItems(targetCollection.id,moveType)}}>MOVE</button>
                <select className='font-bold' onChange={(e)=>{setMoveType(e.target.value)}}>
                    <option value={MoveType.SELECTED}>Selected Companies</option>
                    <option value={MoveType.ALL}>All Companies</option>
                </select>
            </div>
            <div>
                <span className='mr-2'>FROM:</span>
                <span><b>{selectedCollectionName}</b></span>
            </div>
            <div>
                <span className='mr-2'>TO:</span>
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
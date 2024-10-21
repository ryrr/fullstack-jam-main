interface MoveItemsWidgetProps {
    selectedCollectionId:string
    collectionResponse:any
}
const MoveItemsWidget:React.FC<MoveItemsWidgetProps> = ({ selectedCollectionId, collectionResponse })  => {
    let collectionName = selectedCollectionId ? collectionResponse.find((collection) => collection.id === selectedCollectionId).collection_name : ''
    let targetCollections = selectedCollectionId ? collectionResponse?.filter((collection)=>collection.id !== selectedCollectionId):[]
    return(
        <div className='flex justify-between items-center'>
            <div>
                <button>MOVE</button>
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
                <select className='font-bold'>
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
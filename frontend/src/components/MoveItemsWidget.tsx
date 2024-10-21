const MoveItemsWidget = (props:{ selectedCollectionId:string , collectionResponse }) => {
    let collectionName = props.selectedCollectionId ? props.collectionResponse.find((collection) => collection.id === props.selectedCollectionId).collection_name : ''
    let targetCollections = props.selectedCollectionId ? props.collectionResponse?.filter((collection)=>collection.id !== props.selectedCollectionId):[]
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
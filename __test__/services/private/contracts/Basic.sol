pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


contract Stack{

    struct Item{
        string  name;
        uint256 quantity;
        bool isSolid;
    }

    mapping(address => Item[]) userItemsMap;


    function addItem(string memory _name, uint256 _quantity, bool _isSolid) public {
        userItemsMap[msg.sender].push(Item({
            name:_name,
            quantity:_quantity,
            isSolid :_isSolid
            }));
    }

    function getItems() public view returns(Item[] memory){
        return userItemsMap[msg.sender];
    }

    function getLastItem() public view returns(string memory name, uint256 quantity, bool isSolid){
        Item[] memory userItems = userItemsMap[msg.sender];
        require(userItems.length > 0);
        Item memory lastItem = userItems[userItems.length - 1];
        return (lastItem.name, lastItem.quantity, lastItem.isSolid);
    }

}

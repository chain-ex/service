pragma solidity ^0.6.0;

contract SimpleSender{
    uint256  total;
    mapping(address => uint256) userTotal;

    function add(uint256 _quantity) public {
        userTotal[msg.sender] += _quantity;
    }

    function remove(uint256 _quantity) public {
        userTotal[msg.sender] -= _quantity;
    }
    function getTotal()  external view returns(uint256 _total){
        return userTotal[msg.sender];
    }
}

pragma solidity ^0.6.8;

contract Inheritance {

    uint public total;

    function remove(uint256 _amount) public {
        total -= _amount;

    }

}

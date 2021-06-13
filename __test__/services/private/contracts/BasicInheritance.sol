pragma solidity ^0.6.8;

import "./Inheritance.sol";

contract Base is Inheritance {
    function add(uint256 _amount) public {
        total += _amount;

    }

}

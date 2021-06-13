pragma solidity ^0.8.2;

contract Simple {
    uint256 total;
    event log(string, uint256);

    function add(uint256 _quantity) public {
        total += _quantity;
        emit log("add", total);
    }

    function remove(uint256 _quantity) public {
        total -= _quantity;
        emit log("remove", total);
    }

    function getSpec() external view returns (uint256 _total, bool _bool) {
        return (total, true);
    }

    function getTotal() external view returns (uint256 _total) {
        return total;
    }

    function emitTotal() public {
        emit log("total", total);
    }
}

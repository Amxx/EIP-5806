// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20, ERC20TemporaryAllowance} from "./libs/ERC20TemporaryAllowance.sol";

contract ERC20Mock is ERC20TemporaryAllowance {
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public virtual {
        _burn(from, value);
    }
}

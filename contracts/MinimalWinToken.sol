pragma solidity ^0.5.0;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract MinimalWinToken is ERC20Mintable {
    string public name = "MINIMAL WIN TOKEN";
    string public symbol = "MWT";
    uint8 public decimals = 18;
}

pragma solidity ^0.5.0;

import "./MinimalWinToken.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "installed_contracts/oraclize-api/contracts/usingOraclize.sol";

contract MWTCrowdsale is RefundableCrowdsale, MintedCrowdsale, usingOraclize {
    struct Deposit {
        address addr;
        uint256 weiAmount;
        address sender;
    }

    mapping (bytes32 => Deposit) private depositsInProcess;
    mapping (address => uint256) public fundsByAddress;

    // How many seconds stage lasts
    uint256 public stageDuration;

    uint256 public totalTokens;

    constructor (
      uint256 _openingTime, 
      uint256 _closingTime,
      address payable _wallet, 
      MinimalWinToken _token,
      uint256 _stageDuration,
      uint256 _totalTokens
    ) 
    public
      Crowdsale(1, _wallet, _token)
      TimedCrowdsale(_openingTime, _closingTime)
      RefundableCrowdsale(1)
    {
        require(_stageDuration > 0);
        
        stageDuration = _stageDuration;
        totalTokens = _totalTokens;
        _escrow = new RefundEscrow(wallet());

        //TODO: COMMENT THIS WHEN DEPLOYING TO ANYTHING EXCEPT PRIVATE NET
        // ethereum-bridge -H localhost:7545 -a 5
        // OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);
    }

    event LogNewOraclizeQuery(string description);
    event RefundedLostTransfer(address indexed beneficiary, uint256 weiAmount);

    /**
    * @dev Checks whether the period in which the crowdsale is open has already elapsed.
    * @return Whether crowdsale period has elapsed
    */
    function hasClosed() public view returns (bool) {
        return super.hasClosed() || goalReached();
    }

    /**
    * @dev Reverts if not in crowdsale time range. 
    */
    modifier onlyWhileOpen {
        require(now >= openingTime() && now <= closingTime());
        require(goalReached() == false);
        _;
    }

    function goalReached() public view returns (bool) {
        return token().totalSupply() >= totalTokens;
    }

    function elapsedTime() internal view returns (uint256) {
        uint256 time = 0;

        if (block.timestamp > openingTime()) {
            time = block.timestamp.sub(openingTime());
        }

        return time;
    }

    function currentStage() public view returns (uint256) {
        uint256 elapsedTimeVar = elapsedTime();

        // uint256 currentStage = elapsedTime.div(uint256(86400 * 7));
        // uint256 currentStage = elapsedTimeVar.div(60);
        uint256 stage = elapsedTimeVar.div(stageDuration);

        if (stage > 3) {
            stage = 3;
        }

        return stage;
    }

    /**
    * @dev Override to extend the way in which ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount(uint256 _weiAmount, uint256 _rate) internal view returns (uint256) {
        uint256 amount = _weiAmount.mul(_rate).div(1000000); //To counteract 10^6 rate div by 1000000

        uint256 stage = currentStage();

        uint256 multiplier = 100;

        if (stage == 0) {
            multiplier = 125;
        }

        if (stage == 1) {
            multiplier = 115;
        }

        if (stage == 2) {
            multiplier = 110;
        }

        return amount.mul(multiplier).div(100);
    }

    function __callback(bytes32 myid, string memory result) public {
        require(!finalized());
        require(depositsInProcess[myid].weiAmount != 0);
        require(msg.sender == oraclize_cbAddress());
        require(bytes(result).length != 0);
        uint256 rate = parseInt(result, 6);
        require(rate != 0);

        processDeposits(myid, rate);
    }

    function _requestRates() internal returns (bytes32) {
        if (oraclize_getPrice("URL") > address(this).balance) {
            emit LogNewOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
            revert();
        } else {
            emit LogNewOraclizeQuery("Oraclize query was sent, standing by for the answer..");
            // bytes32 queryId = oraclize_query("URL", "json(http://exchange.minimalwin.io/ethusd).rate");
            bytes32 queryId = oraclize_query("URL", "json(http://35.205.73.238:7575/ethAvgRate).rate");
            return queryId;
        }
    }

    function buyTokens(address _beneficiary) public payable {
        uint256 weiAmount = msg.value.sub(oraclize_getPrice("URL"));

        _preValidatePurchase(_beneficiary, weiAmount);

        bytes32 queryId = _requestRates();

        if (queryId.length == 0) {
            revert();
        }

        depositsInProcess[queryId] = Deposit(_beneficiary, weiAmount, msg.sender);
        fundsByAddress[msg.sender] = fundsByAddress[msg.sender].add(weiAmount);
    }

    function processDeposits(bytes32 myid, uint256 _rate) internal {
        Deposit storage deposit = depositsInProcess[myid];

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(deposit.weiAmount, _rate);

        // update state
        _weiRaised = _weiRaised.add(deposit.weiAmount);

        _processPurchase(deposit.addr, tokens);
        emit TokensPurchased(deposit.sender, deposit.addr, deposit.weiAmount, tokens);

        _forwardFunds(deposit);
        
        fundsByAddress[deposit.sender] = fundsByAddress[deposit.sender].sub(deposit.weiAmount);
        delete depositsInProcess[myid];
    }

    function _forwardFunds(Deposit memory deposit) internal {
        _escrow.deposit.value(deposit.weiAmount)(deposit.addr);
    }

    function refundLostTransfer() public {
        uint256 lostFunds = fundsByAddress[msg.sender];
        require(lostFunds > 0);
        fundsByAddress[msg.sender] = 0;
        msg.sender.transfer(lostFunds);
        emit RefundedLostTransfer(msg.sender, lostFunds);
    }
}

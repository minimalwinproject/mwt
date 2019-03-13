pragma solidity ^0.5.0;

import "./MinimalWinToken.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "installed_contracts/oraclize-api/contracts/usingOraclize.sol";

contract MWTCrowdsale is RefundableCrowdsale, CappedCrowdsale, MintedCrowdsale, Ownable, usingOraclize {
    struct Deposit {
        address addr;
        uint256 weiAmount;
        address sender;
    }

    mapping (bytes32 => Deposit) private depositsInProcess;
    mapping (address => uint256) public fundsByAddress;

    uint256 private preICOEndTime;
    uint256 private firstStageEndTime;
    uint256 private secondStageEndTime;
    
    uint256 public firstHalfTeamTokens;
    uint256 public secondHalfTeamTokens;
    uint256 public firstHalfAdvisersTokens;
    uint256 public secondHalfAdvisersTokens;
    uint256 public bountiesTokens;
    uint256 public projectTokens;    

    constructor (
        uint256 _openingTime, 
        uint256 _closingTime,
        uint256 _preICOEndTime,
        uint256 _firstStageEndTime,
        uint256 _secondStageEndTime,
        address payable _wallet, 
        MinimalWinToken _token,
        uint256 _goal,
        uint256 _cap
    ) 
    public
        Crowdsale(1, _wallet, _token)
        TimedCrowdsale(_openingTime, _closingTime)
        RefundableCrowdsale(_goal)
        CappedCrowdsale(_cap)
    {
        //As goal needs to be met for a successful crowdsale
        //the value needs to less or equal than a cap which is limit for accepted funds
        require(_goal <= _cap, "Goal should be less than cap");
        require(_preICOEndTime > _openingTime, "Opening time should be less than Pre ICO end time");
        require(_firstStageEndTime > _preICOEndTime, "Pre ICO end time should be less than First stage end time");
        require(_secondStageEndTime > _firstStageEndTime, "First stage end time should be less than Second stage end time");
        require(_closingTime > _secondStageEndTime, "Second stage end time should be less than Closing time");

        preICOEndTime = _preICOEndTime;
        firstStageEndTime = _firstStageEndTime;
        secondStageEndTime = _secondStageEndTime;
    }

    event LogNewOraclizeQuery(string description);
    event RefundedLostTransfer(address indexed beneficiary, uint256 weiAmount);

    function _finalization() internal {
      generateAdditionalTokens();
    
      super._finalization();
    }

    function minimumPurchaseAmount() internal view returns (uint256) {
        if (currentStage() == 0) {
            return 1000000000000000000;
        }

        return 250000000000000000;
    }

    function currentStage() public view returns (uint256) {
        if (block.timestamp <= preICOEndTime) {
            return 0;
        }

        if (block.timestamp <= firstStageEndTime) {
            return 1;
        }

        if (block.timestamp <= secondStageEndTime) {
            return 2;
        }

        return 3;
    }

    /**
    * @dev Override to extend the way in which ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount(uint256 _weiAmount, uint256 _rate) internal view returns (uint256) {
        uint256 amount = _weiAmount.mul(_rate).div(100000); //To counteract 10^6 rate div by 1000000

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
        require(!finalized(), "Crowdsale is finished");
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
        require(msg.value >= minimumPurchaseAmount(), "Wei amount is less than minimum allowed");
        require(msg.value <= 100000000000000000000, "Wei amount is higher than maximum allowed");

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

        require(fundsByAddress[deposit.sender].sub(deposit.weiAmount) >=0);
        fundsByAddress[deposit.sender] = fundsByAddress[deposit.sender].sub(deposit.weiAmount);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(deposit.weiAmount, _rate);

        // update state
        _weiRaised = _weiRaised.add(deposit.weiAmount);

        _processPurchase(deposit.addr, tokens);

        _forwardFunds(deposit);
        
        delete depositsInProcess[myid];

        emit TokensPurchased(deposit.sender, deposit.addr, deposit.weiAmount, tokens);
    }

    function generateAdditionalTokens() internal {
        uint256 purchased_amount = token().totalSupply();
        uint256 additional_tokens = purchased_amount.mul(55).div(45);
        uint256 team_tokens = additional_tokens.mul(15).div(55).div(2);
        uint256 advisers_tokens = additional_tokens.mul(2).div(55).div(2);
        uint256 bounties_tokens = additional_tokens.mul(3).div(55);
        uint256 project_tokens = additional_tokens.mul(35).div(55);

        firstHalfTeamTokens = firstHalfTeamTokens.add(team_tokens);
        secondHalfTeamTokens = secondHalfTeamTokens.add(team_tokens);
        firstHalfAdvisersTokens = firstHalfAdvisersTokens.add(advisers_tokens);
        secondHalfAdvisersTokens = secondHalfAdvisersTokens.add(advisers_tokens);
        bountiesTokens = bountiesTokens.add(bounties_tokens);
        projectTokens = projectTokens.add(project_tokens);
    }

    function getFirstHalfTeamTokens(address beneficiary, uint256 tokenAmount) public onlyOwner {
        require(finalized(), "Can't get additional tokens while contract is not finalized");
        require(goalReached(), "Can't get additional tokens if goal wasn't reached");
        require(block.timestamp.sub(closingTime()) >= 15768000, "First half of team tokens will become available a year after contract finalization");
        require(firstHalfTeamTokens >= tokenAmount, "Not enough tokens stored for team in first half");

        firstHalfTeamTokens = firstHalfTeamTokens.sub(tokenAmount);

        require(MinimalWinToken(address(token())).mint(beneficiary, tokenAmount), "Minting first half of team tokens failed");
    }

    function getSecondHalfTeamTokens(address beneficiary, uint256 tokenAmount) public onlyOwner {
        require(finalized(), "Can't get additional tokens while contract is not finalized");
        require(goalReached(), "Can't get additional tokens if goal wasn't reached");
        require(block.timestamp.sub(closingTime()) >= 31536000, "First half of team tokens will become available a year after contract finalization");
        require(secondHalfTeamTokens >= tokenAmount, "Not enough tokens stored for team in second half");

        secondHalfTeamTokens = secondHalfTeamTokens.sub(tokenAmount);

        require(MinimalWinToken(address(token())).mint(beneficiary, tokenAmount), "Minting second half of team tokens failed");
    }

    function getFirstHalfAdvisersTokens(address beneficiary, uint256 tokenAmount) public onlyOwner {
        require(finalized(), "Can't get additional tokens while contract is not finalized");
        require(goalReached(), "Can't get additional tokens if goal wasn't reached");
        require(block.timestamp.sub(closingTime()) >= 15768000, "First half of advisers tokens will become available a year after contract finalization");
        require(firstHalfAdvisersTokens >= tokenAmount, "Not enough tokens stored for advisers in first half");

        firstHalfAdvisersTokens = firstHalfAdvisersTokens.sub(tokenAmount);

        require(MinimalWinToken(address(token())).mint(beneficiary, tokenAmount), "Minting first half of advisers tokens failed");
    }

    function getSecondHalfAdvisersTokens(address beneficiary, uint256 tokenAmount) public onlyOwner {
        require(finalized(), "Can't get additional tokens while contract is not finalized");
        require(goalReached(), "Can't get additional tokens if goal wasn't reached");
        require(block.timestamp.sub(closingTime()) >= 31536000, "First half of advisers tokens will become available a year after contract finalization");
        require(secondHalfAdvisersTokens >= tokenAmount, "Not enough tokens stored for advisers in second half");

        secondHalfAdvisersTokens = secondHalfAdvisersTokens.sub(tokenAmount);

        require(MinimalWinToken(address(token())).mint(beneficiary, tokenAmount), "Minting second half of advisers tokens failed");
    }

    function getBountiesTokens(address beneficiary, uint256 tokenAmount) public onlyOwner {
        require(finalized(), "Can't get additional tokens while contract is not finalized");
        require(goalReached(), "Can't get additional tokens if goal wasn't reached");
        require(bountiesTokens >= tokenAmount, "Not enough tokens stored for bounties");

        bountiesTokens = bountiesTokens.sub(tokenAmount);

        require(MinimalWinToken(address(token())).mint(beneficiary, tokenAmount), "Minting bounty tokens failed");
    }

    function getProjectTokens(address beneficiary, uint256 tokenAmount) public onlyOwner {
        require(finalized(), "Can't get additional tokens while contract is not finalized");
        require(goalReached(), "Can't get additional tokens if goal wasn't reached");
        require(block.timestamp.sub(closingTime()) >= 31536000, "Project tokens will become available a year after contract finalization");
        require(projectTokens >= tokenAmount, "Not enough tokens stored for project");

        projectTokens = projectTokens.sub(tokenAmount);

        require(MinimalWinToken(address(token())).mint(beneficiary, tokenAmount), "Minting project tokens failed");
    }

    function _forwardFunds(Deposit memory deposit) internal {
        _escrow.deposit.value(deposit.weiAmount)(deposit.addr);
    }

    function refundLostTransfer() public {
        // require(finalized());
        uint256 lostFunds = fundsByAddress[msg.sender];
        require(lostFunds > 0);
        fundsByAddress[msg.sender] = 0;
        msg.sender.transfer(lostFunds);
        emit RefundedLostTransfer(msg.sender, lostFunds);
    }
}

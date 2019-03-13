const MinimalWinToken = artifacts.require("./MinimalWinToken.sol");

contract('MinimalWinToken', function(accounts) {
  let minimalWinToken;

  beforeEach('setup contract for each test', async function () {
    minimalWinToken = await MinimalWinToken.new();
  })

  afterEach('clean contract after each test', async function () {
  })

  // it("Was deployed", function(done) {
  //   assert.notEqual(minimalWinToken.address, null);
  //   done();
  // });

  it('Was deployed', async function () {
    assert.notEqual(await minimalWinToken.address, null);
  })

  it("Name equals 'MINIMAL WIN TOKEN'", async function() {
    assert.equal(await minimalWinToken.name(), 'MINIMAL WIN TOKEN');
  });

  it("Symbol equals 'MWT'", async function() {
    assert.equal(await minimalWinToken.symbol(), 'MWT');
  });

  it("Decimals equals 18", async function() {
    assert.equal(await minimalWinToken.decimals(), 18);
  });

  it('Has minter', async function () {
    assert.equal(await minimalWinToken.isMinter(accounts[0]), true);
  })

  it('Minter can transfer role', async function () {
    assert.equal(await minimalWinToken.isMinter(accounts[1]), false);
    await minimalWinToken.addMinter(accounts[1], {
      from: accounts[0]
    })
    assert.equal(await minimalWinToken.isMinter(accounts[1]), true);
    await minimalWinToken.renounceMinter({
      from: accounts[1]
    })
    assert.equal(await minimalWinToken.isMinter(accounts[1]), false);

    try {
      await minimalWinToken.addMinter(accounts[2], {
        from: accounts[1]
      })
      assert.fail()
    } catch (error) {
      // console.log(error.toString());
      assert(error.toString().includes('invalid opcode') == false, error.toString())
    }
  })

  it('Should not be able to send ETH to contract', async function () {
    try {
      await minimalWinToken.send(web3.toWei(1, "ether"))
      assert.fail()
    } catch (error) {
      // console.log(error.toString());
      assert(error.toString().includes('invalid opcode') == false, error.toString())
    }
  })
});

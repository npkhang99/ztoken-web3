const ethereum = window.ethereum
const web3 = new Web3(ethereum)

let initialized = false

const FAUCET_ADDRESS = '0x21A2970671E05579B5A17C01296c53955290296B'
const ZTOKEN_ADDRESS = '0xc9ee4a2a5b374ea8e4b86d91a4154258d830b591'

document.getElementById('detectMetaMaskBtn').addEventListener('click', async () => {
    const chainId = await ethereum.request({method: 'eth_chainId'});
    ethereum.request({ method: 'eth_requestAccounts' })

    const accounts = await web3.eth.getAccounts()

    if (chainId !== '0xaa36a7') {
        alert('Only SEPOLIA testnet is supported !')
        return
    }

    if (!accounts || accounts.length === 0) {
        alert('You must allow at least 1 account')
        return
    }

    const account = accounts[0]
    document.getElementById('metaMaskData').innerText = `Chain ID: ${chainId}\nAccounts: ${account}`

    initialized = true

    const ERC20BalanceOfAbi = [{
        constant: true,
        inputs: [
            {
                name: "_owner",
                type: "address",
            },
        ],
        name: "balanceOf",
        outputs: [
            {
                name: "balance",
                type: "uint256",
            },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
    }]

    const contract = new web3.eth.Contract(ERC20BalanceOfAbi, ZTOKEN_ADDRESS);
    document.getElementById("balanceField").innerText = '...'
    contract.methods
        .balanceOf(account)
        .call()
        .then(balance => document.getElementById("balanceField").innerText = web3.utils.fromWei(balance, "ether"));
})

document.getElementById('claimZTokenFromFaucetBtn').addEventListener('click', async () => {
    if (!initialized) {
        alert('You haven\'t initialized MetaMask yet.\nPlease click the "Detect MetaMask" button first')
        return
    }

    const account = (await web3.eth.getAccounts())[0]
    const ZTokenFaucetAbi = [{
        'inputs': [],
        'name': 'request',
        'outputs': [],
        'stateMutability': 'nonpayable',
        'type': 'function'
    }]

    const faucet = new web3.eth.Contract(ZTokenFaucetAbi, FAUCET_ADDRESS)

    const requestFunctionSignature = web3.eth.abi.encodeFunctionSignature('request()')

    // get estimated gas, if error use 1e6 as default value
    const estimatedGas = await web3.eth.estimateGas({
        from: account,
        data: requestFunctionSignature,
        to: FAUCET_ADDRESS
    }).catch(1e6)
    // get estimated gas price, if error use 1e9 as default value
    const gasPrice = await web3.eth.getGasPrice().catch(1e9)

    console.log(`Starting to claim from address ${account} with:\n  Gas: ${estimatedGas}\n  Gas price: ${gasPrice}`)
    faucet.methods
        .request()
        .send({
            from: account,
            gas: estimatedGas.toString(),
            gasPrice: gasPrice.toString(),
            data: requestFunctionSignature
        })
        .then(() => alert('Successfully claimed 1000 tokens.'))
        .catch((error, receipt) => {
            alert(`ERROR! Check the console for details`)
            console.error(error);
            if (receipt !== undefined) {
                console.error(receipt)
            }
        })
})

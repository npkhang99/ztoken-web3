const ethereum = window.ethereum
const web3 = new Web3(ethereum)

let initialized = false

const FAUCET_ADDRESS = '0x21A2970671E05579B5A17C01296c53955290296B'
const TOKENZ_ADDRESS = '0xc9ee4a2a5b374ea8e4b86d91a4154258d830b591'
const VRFGAME_ADDRESS = '0xe7C610a5Ca34142B22e22616DA96B9b3dd8De916'

const ONE_MWEI = web3.utils.toWei(1, 'mwei')
const ONE = BigInt(10) ** BigInt(18)

const tokenZAbi = [
    {
        'inputs': [
            {
                'internalType': 'address',
                'name': 'account',
                'type': 'address'
            }
        ],
        'name': 'balanceOf',
        'outputs': [
            {
                'internalType': 'uint256',
                'name': '',
                'type': 'uint256'
            }
        ],
        'stateMutability': 'view',
        'type': 'function'
    },
    {
        'inputs': [
            {
                'internalType': 'address',
                'name': 'spender',
                'type': 'address'
            },
            {
                'internalType': 'uint256',
                'name': 'amount',
                'type': 'uint256'
            }
        ],
        'name': 'approve',
        'outputs': [
            {
                'internalType': 'bool',
                'name': '',
                'type': 'bool'
            }
        ],
        'stateMutability': 'nonpayable',
        'type': 'function'
    }
]

document.getElementById('detectMetaMaskBtn').addEventListener('click', async () => {
    const chainId = await ethereum.request({method: 'eth_chainId'});
    if (chainId !== '0xaa36a7') {
        alert('Only SEPOLIA testnet is supported !')
        return
    }

    await ethereum.request({method: 'eth_requestAccounts'}).catch(console.error)
    const accounts = await web3.eth.getAccounts()
    if (!accounts || accounts.length === 0) {
        alert('You must allow at least 1 account')
        return
    }

    const account = accounts[0]
    document.getElementById('metaMaskData').innerText = `Chain ID: ${chainId}\nAccounts: ${account}`

    initialized = true

    const tokenZContract = new web3.eth.Contract(tokenZAbi, TOKENZ_ADDRESS);
    document.getElementById("balanceField").innerText = '...'
    tokenZContract.methods
        .balanceOf(account)
        .call()
        .then(balance => document.getElementById("balanceField").innerText = web3.utils.fromWei(balance, "ether"));
})

document.getElementById('claimTokenZFromFaucetBtn').addEventListener('click', async () => {
    if (!initialized) {
        alert('You haven\'t initialized MetaMask yet.\nPlease click the "Detect MetaMask" button first')
        return
    }

    const account = (await web3.eth.getAccounts())[0]
    const tokenZFaucetAbi = [{
        'inputs': [],
        'name': 'request',
        'outputs': [],
        'stateMutability': 'nonpayable',
        'type': 'function'
    }]

    const faucetContract = new web3.eth.Contract(tokenZFaucetAbi, FAUCET_ADDRESS)
    const requestFunctionSignature = web3.eth.abi.encodeFunctionSignature('request()')

    // get estimated gas price, if error use 1e9 as default value
    const gasPrice = await web3.eth.getGasPrice().catch(1e9)

    console.log(`Starting to claim from address ${account} with:\n  Gas price: ${gasPrice}`)
    faucetContract.methods
        .request()
        .send({
            from: account,
            gas: ONE_MWEI.toString(),
            gasPrice: gasPrice.toString(),
            data: requestFunctionSignature
        })
        .then(() => {
            alert('Successfully claimed 1000 tokens.')
            document.getElementById('detectMetaMaskBtn').click()
        })
        .catch((error, receipt) => {
            alert(`ERROR! Check the console for details`)
            console.error(error);
            if (receipt !== undefined) {
                console.error(receipt)
            }
        })
})

document.getElementById('approveGameBtn').addEventListener('click', async () => {
    if (!initialized) {
        alert('You haven\'t initialized MetaMask yet.\nPlease click the "Detect MetaMask" button first')
        return
    }

    const account = (await web3.eth.getAccounts())[0]
    const tokenZContract = new web3.eth.Contract(tokenZAbi, TOKENZ_ADDRESS)

    const approveFunctionSignature = web3.eth.abi.encodeFunctionSignature('request(address,uint256)')


    // get estimated gas price, if error use 1e9 as default value
    const gasPrice = await web3.eth.getGasPrice().catch(1e9)

    tokenZContract.methods
        .approve(account, ONE * BigInt(1000000))
        .send({
            from: account,
            gas: ONE_MWEI.toString(),
            gasPrice: gasPrice.toString(),
            data: approveFunctionSignature
        })
        .then((ok) => {
            alert(ok ? 'Successfully approve VRF Game' : 'Failed to approve VRF Game')
        })
        .catch((error, receipt) => {
            alert(`ERROR! Check the console for details`)
            console.error(error);
            if (receipt !== undefined) {
                console.error(receipt)
            }
        })
})

function getOutcome(outcome) {
    if (outcome === 1n) {
        return "100% win";
    } else if (outcome === 2n) {
        return "20% win";
    } else if (outcome === 3n) {
        return "Draw";
    } else if (outcome === 4n) {
        return "20% loss";
    } else if (outcome === 5n) {
        return "100% loss";
    }
}

document.getElementById('playBtn').addEventListener('click', async () => {
    if (!initialized) {
        alert('You haven\'t initialized MetaMask yet.\nPlease click the "Detect MetaMask" button first')
        return
    }

    const account = (await web3.eth.getAccounts())[0]

    const VRFGameMakeBetAbi = [
        {
            'inputs': [
                {
                    'internalType': 'uint256',
                    'name': 'amount',
                    'type': 'uint256'
                }
            ],
            'name': 'makeBet',
            'outputs': [
                {
                    'internalType': 'uint256',
                    'name': 'gameId',
                    'type': 'uint256'
                }
            ],
            'stateMutability': 'nonpayable',
            'type': 'function'
        },
        {
            'anonymous': false,
            'inputs': [
                {
                    'indexed': true,
                    'internalType': 'uint256',
                    'name': 'gameId',
                    'type': 'uint256'
                },
                {
                    'indexed': true,
                    'internalType': 'enum VRFGame.Outcomes',
                    'name': 'outcome',
                    'type': 'uint8'
                }
            ],
            'name': 'GameFinished',
            'type': 'event'
        }
    ]

    const makeBetContract = new web3.eth.Contract(VRFGameMakeBetAbi, VRFGAME_ADDRESS)
    const makeBetFunctionSignature = web3.eth.abi.encodeFunctionSignature('makeBet(uint256)')

    // get estimated gas price, if error use 1e9 as default value
    const gasPrice = await web3.eth.getGasPrice().catch(1e9)

    makeBetContract.methods
        .makeBet(ONE * BigInt(100))
        .send({
            from: account,
            gas: ONE_MWEI.toString(),
            gasPrice: gasPrice.toString(),
            data: makeBetFunctionSignature
        })
        .then((receipt) => alert(`Placed one game at tx ${receipt.transactionHash}`))
        .catch((error, receipt) => {
            alert(`ERROR! Check the console for details`)
            console.error(error);
            if (receipt !== undefined) {
                console.error(receipt)
            }
        })

    makeBetContract.events
        .GameFinished()
        .on('data', (event) => {
            console.log(`Received a GameFinished event`)
            alert(`Game outcome: ${getOutcome(event.returnValues.outcome)}`)
            document.getElementById('detectMetaMaskBtn').click()
        })
})

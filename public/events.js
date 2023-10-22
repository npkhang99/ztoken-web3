const ethereum = window.ethereum
const web3 = new Web3(ethereum)

let initialized = false

const TOGGLE_ON = true
const TOGGLE_OFF = false

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

const detectMetaMaskBtn = document.getElementById('detectMetaMaskBtn')
const claimTokenZBtn = document.getElementById('claimTokenZFromFaucetBtn')
const approveGameBtn = document.getElementById('approveGameBtn')
const playBtn = document.getElementById('playBtn')

function showAlert(alertElementId, alertType, message) {
    const alertPlaceholder = document.getElementById(alertElementId)
    const msgDivs = []
    message.split(/\r?\n|\r|\n/g).forEach((msgLine) => {
        msgDivs.push(`<div>${msgLine}</div>`)
    })

    const alertDiv = [
        `<div class="alert alert-${alertType} alert-dismissible fade show" role="alert">`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        `   ${msgDivs.join()}`,
        '</div>'
    ].join('')
    alertPlaceholder.innerHTML += alertDiv
}

function toggleButtonProcessing(btn, spinner, toggleOn = TOGGLE_ON) {
    if (toggleOn === TOGGLE_ON) {
        detectMetaMaskBtn.classList.add('disabled')
        spinner.classList.remove('visually-hidden')
    } else {
        detectMetaMaskBtn.classList.remove('disabled')
        spinner.classList.add('visually-hidden')
    }
}

detectMetaMaskBtn.addEventListener('click', async () => {
    const spinner = document.getElementById('detectMetaMaskSpinner')
    try {
        toggleButtonProcessing(detectMetaMaskBtn, spinner, TOGGLE_ON)

        const chainId = parseInt(await ethereum.request({method: 'eth_chainId'}), 16)
        if (chainId !== 11155111) {
            showAlert('alertDiv', 'danger', 'Only SEPOLIA testnet is supported.\nPlease re-select network.')
            throw 'Wrong network error'
        }

        await ethereum.request({method: 'eth_requestAccounts'}).catch(console.error)
        const accounts = await web3.eth.getAccounts()
        if (!accounts || accounts.length === 0) {
            showAlert('alertDiv', 'danger', 'You must allow at least 1 account.')
            throw 'Invalid account count'
        }

        const account = accounts[0]
        document.getElementById('metaMaskData').innerText = `Chain ID: ${chainId}\nAccounts: ${account}`

        initialized = true

        const tokenZContract = new web3.eth.Contract(tokenZAbi, TOKENZ_ADDRESS);
        document.getElementById("balanceField").innerText = '...'
        tokenZContract.methods
            .balanceOf(account)
            .call()
            .then(balance => document.getElementById("balanceField").innerText = web3.utils.fromWei(balance, "ether"))
            .finally(() => {
                toggleButtonProcessing(detectMetaMaskBtn, spinner, TOGGLE_OFF)
                showAlert('alertDiv', 'primary', 'Successfully get account infos')
            });
    } catch (e) {
        toggleButtonProcessing(detectMetaMaskBtn, spinner, TOGGLE_OFF)
    }
})

claimTokenZBtn.addEventListener('click', async () => {
    const spinner = document.getElementById('claimingTokenSpinner')
    try {
        toggleButtonProcessing(claimTokenZBtn, spinner, TOGGLE_ON)

        if (!initialized) {
            showAlert('alertDiv', 'danger', 'You haven\'t initialized MetaMask yet.\nPlease click the "Detect MetaMask" button first.')
            throw 'MetaMask not initialized'
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
                showAlert(
                    'alertDiv',
                    'success',
                    'You haven\'t initialized MetaMask yet.\nPlease click the "Detect MetaMask" button first.'
                )
                detectMetaMaskBtn.click()
            })
            .catch((error, receipt) => {
                showAlert('alertDiv', 'danger', 'Can\'t claim TokenZ. Please try again.')
                console.error(error);
                if (receipt !== undefined) {
                    console.error(receipt)
                }
            })
            .finally(() => toggleButtonProcessing(claimTokenZBtn, spinner, TOGGLE_OFF))
    } catch (e) {
        toggleButtonProcessing(claimTokenZBtn, spinner, TOGGLE_OFF)
    }
})

approveGameBtn.addEventListener('click', async () => {
    const spinner = document.getElementById('approvingGameSpinner')
    try {
        toggleButtonProcessing(approveGameBtn, spinner, TOGGLE_ON)

        if (!initialized) {
            showAlert(
                'alertDiv',
                'danger',
                'You haven\'t initialized MetaMask yet.\nPlease click the "Detect MetaMask" button first.'
            )
            throw 'MetaMask not initialized'
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
                showAlert(
                    'alertDiv',
                    ok ? 'success' : 'danger',
                    ok ? 'Successfully approve VRF Game' : 'Failed to approve VRF Game'
                )
            })
            .catch((error, receipt) => {
                showAlert('alertDiv', 'danger', 'Can\'t claim TokenZ. Please try again.')
                console.error(error);
                if (receipt !== undefined) {
                    console.error(receipt)
                }
            })
            .finally(() => toggleButtonProcessing(approveGameBtn, spinner, TOGGLE_OFF))
    } catch (e) {
        toggleButtonProcessing(approveGameBtn, spinner, TOGGLE_OFF)
    }
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

playBtn.addEventListener('click', async () => {
    const spinner = document.getElementById('playSpinner')
    try {
        toggleButtonProcessing(playBtn, spinner, TOGGLE_ON)

        if (!initialized) {
            showAlert(
                'alertDiv',
                'danger',
                'You haven\'t initialized MetaMask yet.\nPlease click the "Detect MetaMask" button first.'
            )
            throw 'MetaMask not initialized'
        }

        const betAmount = parseInt(document.getElementById('betAmountInput').value)
        if (Number.isNaN(betAmount)) {
            showAlert(
                'alertDiv',
                'danger',
                'Invalid bet amount input. Please try again.'
            )
            throw 'Invalid bet amount'
        }

        if (betAmount <= 0) {
            showAlert(
                'alertDiv',
                'danger',
                'Can\'t bet a non-positive number of token. Please try again.'
            )
            throw 'Invalid bet amount'
        }

        if (betAmount > 100) {
            showAlert(
                'alertDiv',
                'danger',
                'The maximum bet amount is 100 tokens. Please try again.'
            )
            throw 'Invalid bet amount'
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
            .then((receipt) => {
                showAlert(
                    'alertDiv',
                    'primary',
                    `Placed one game at tx ${receipt.transactionHash}`
                )

                makeBetContract.events
                    .GameFinished()
                    .on('data', (event) => {
                        console.log(`Received a GameFinished event`)
                        showAlert(
                            'alertDiv',
                            'primary',
                            `Game outcome: ${getOutcome(event.returnValues.outcome)}`
                        )
                        document.getElementById('detectMetaMaskBtn').click()
                    })
            })
            .catch((error, receipt) => {
                showAlert('alertDiv', 'danger', 'Can\'t claim TokenZ. Please try again.')
                console.error(error);
                if (receipt !== undefined) {
                    console.error(receipt)
                }
            })
            .finally(() => toggleButtonProcessing(playBtn, spinner, TOGGLE_OFF))
    } catch (e) {
        toggleButtonProcessing(playBtn, spinner, TOGGLE_OFF)
    }
})

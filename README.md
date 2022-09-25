# Warp Test App Using Vue 3 + Vite

This app assumes that Arlocal is running and that the user has ArConnect.

To use the app, simply press the buttons in order:
1. Create Sample Contracts
Creates part of an AFTR vehicle contract with the user as the owner and a PST contract for the user to deposit into the AFTR vehicle.
2. Read Contracts
Reads both new contracts and displays them.  The AFTR contract is displayed twice, once as the readState() returns and then again after a 5 second delay.
3. Deposit Tokens
Performs a token deposit interaction from the PST to the AFTR vehicle using internal write.
4. Withdrawal Tokens
Withdrawals 2 tokens from the AFTR contract and adds them to the PST contract.

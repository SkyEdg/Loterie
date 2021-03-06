import { useEffect, useState } from 'react'
import Participants from "./participants"
import { Accordion, AccordionSummary, TextField, Button} from '@material-ui/core';
import { DataGrid } from '@mui/x-data-grid';

const columns: GridColDef[] = [
  { field: 'current', headerName: 'Amount (Eth)', width: 125 },
  { field: 'max', headerName: 'Max (Eth)', width: 125 },
  { field: 'tolerance', headerName: 'Tolerance', width: 100 },
  { field: 'lockBlock', headerName: 'Lock Block', width: 100 },
  { field: 'status', headerName: 'Status', width: 100 },
  { field: 'winner', headerName: "Winner's address", width: 375 },
];

function Lottery({ data, i, web3, currentBlock, contract, account }) {

  const [amount, setAmount] = useState(0.0001)
  const [winner, setWinner] = useState(null)

  const toEth = (wei) => {
    return web3.utils.fromWei(wei, "ether")
  }

  const is_over = () => {
    const lockBlock = parseInt(data.lock_block, 10)
    const max = parseInt(data.max_amount, 10)
    const total = parseInt(data.total_amount, 10)
    return (currentBlock >= lockBlock || max < total)
  }

  const can_withdraw = () => {
    return !data.is_dropped
  }

  const status = () => {
    if (is_over()) {
      return "over"
    } else {
      return ((data.lock_block - currentBlock) * 13).toString() + " seconds"
    }
  }

  useEffect(() => {
    if (is_over()){
      contract.methods.get_winner(i).call({from: account}).then((addr) => {
        setWinner(addr)
      }).catch((error) => {})
    }

    web3.eth.subscribe("newBlockHeaders", (error, event) => {
      if (!error) {
        contract.methods.get_winner(i).call({from: account}).then((addr) => {
          setWinner(addr)
        }).catch((error) => {
          // console.log(error)
        });
      }
    });

  }, [])


  const participate = () => {
    // 146 809 gas au premier call sur la lottery
    // 101 809 gas au calls suivant
    let eth = web3.utils.toWei(amount.toString(), "ether")
    console.log("participating with", account)
    contract.methods.participate(i).send({from: account, gas: 150000, value: eth })
  }

  function handleAmountChange(e) {
    let value = e.target.value;
    value.replace(/\D/, '');
    if(value < 0) {
      return
    }
    setAmount(value)
  }


  function withdraw() {
    contract.methods.withdraw_gains(i).send({from: account, gas: 200000})
  }

  const row = [{
    id: 1,
    current: toEth(data.total_amount),
    max: toEth(data.max_amount),
    tolerance: toEth(data.exceeding_tolerance),
    lockBlock: data.lock_block,
    status: status(),
    winner: winner
  }]

  return (
    <Accordion>
      <AccordionSummary>
      Lottery number {i}
      </AccordionSummary>


      <TextField
        id="amountField"
        label="Amount"
        variant="outlined"
        value={amount}
        onChange={e => handleAmountChange(e)}
        inputProps={{
          style: {
            padding: 10,
          }
        }}
      />

      <Button
        variant="contained"
        onClick={participate}
        inputProps={{
          style: {
            padding: 10,
          }
        }}
      >
        Participate
      </Button>

      <Button
        variant="contained"
        onClick={withdraw}
        disabled={!(account===winner && can_withdraw())}
        inputProps={{
          style: {
            padding: 10,
          }
        }}
      >
        Withdraw
      </Button>

      <div style={{ height: 110, width: '100%' }}>
        <DataGrid
          hideFooter={true}
          rows={row}
          columns={columns}
          rowsPerPageOptions={[]}
        />
      </div>

      <Accordion>
        <AccordionSummary>
        Participants
        </AccordionSummary>
        <Participants data={data} web3={web3}/>
      </Accordion>
    </Accordion>
  );
}

export default Lottery;

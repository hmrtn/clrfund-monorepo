<template>
  <div class="modal-body">
    <div v-if="step === 1">
      <h3>
        Contribute {{ tokenSymbol }} to the
        {{ isRoundFinished() ? 'next' : 'current' }} round
      </h3>
      <div class="contribution-form">
        <input-button
          v-model="amount"
          :input="{
            placeholder: 10,
            class: { invalid: !isAmountValid },
            required: true,
          }"
        />
      </div>
      <div v-if="!isBalanceSufficient" class="balance-check-warning">
        ⚠️ You only have {{ renderBalance }}
        {{ tokenSymbol }}
      </div>
      <div class="btn-row">
        <button class="btn-secondary" @click="$emit('close')">Cancel</button>
        <button
          class="btn-action"
          :disabled="!isAmountValid()"
          @click="contributeMatchingFunds()"
        >
          Contribute
        </button>
      </div>
    </div>
    <div v-if="step === 2">
      <h3>
        Contribute {{ renderContributionAmount }} {{ tokenSymbol }} to the
        {{ isRoundFinished() ? 'next' : 'current' }} round
      </h3>
      <transaction
        :hash="transferTxHash"
        :error="transferTxError"
        @close="$emit('close')"
      ></transaction>
    </div>
    <div v-if="step === 3">
      <div class="big-emoji">💦</div>
      <h3>
        You just topped up the pool by {{ renderContributionAmount }}
        {{ tokenSymbol }}!
      </h3>
      <div class="mb2">Thanks for helping out all our projects.</div>
      <button class="btn-primary" @click="$emit('close')">Done</button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'
import { BigNumber, Contract, Signer } from 'ethers'
import { parseFixed } from '@ethersproject/bignumber'
import Transaction from '@/components/Transaction.vue'
import InputButton from '@/components/InputButton.vue'
import { waitForTransaction } from '@/utils/contracts'
import { formatAmount } from '@/utils/amounts'
import { getTokenLogo } from '@/utils/tokens'
import { formatUnits } from '@ethersproject/units'

import { User } from '@/api/user'
import { ERC20 } from '@/api/abi'
import { factory } from '@/api/core'
import { RoundStatus } from '@/api/round'

@Component({
  components: {
    Transaction,
    InputButton,
  },
})
export default class MatchingFundsModal extends Vue {
  step = 1

  signer!: Signer

  amount = '100'
  transferTxHash = ''
  transferTxError = ''

  get walletProvider(): any {
    return this.$store.state.currentUser?.walletProvider
  }

  get currentUser(): User | null {
    return this.$store.state.currentUser
  }

  get balance(): string | null {
    const balance = this.currentUser?.balance
    if (balance === null || typeof balance === 'undefined') {
      return null
    }
    return formatUnits(balance, 18)
  }

  get renderBalance(): string | null {
    const balance: BigNumber | null | undefined = this.currentUser?.balance
    if (balance === null || typeof balance === 'undefined') return null
    const { nativeTokenDecimals } = this.$store.state.currentRound
    return formatAmount(balance, nativeTokenDecimals, null, 5)
  }

  get renderContributionAmount(): string | null {
    const { nativeTokenDecimals } = this.$store.state.currentRound
    return formatAmount(this.amount, nativeTokenDecimals, null, null)
  }

  get isBalanceSufficient(): boolean {
    if (this.balance === null) return false
    return parseFloat(this.balance) >= parseFloat(this.amount)
  }

  isRoundFinished(): boolean {
    const { status } = this.$store.state.currentRound
    return [RoundStatus.Finalized, RoundStatus.Cancelled].includes(status)
  }

  isAmountValid(): boolean {
    const { nativeTokenDecimals } = this.$store.state.currentRound
    let amount
    try {
      amount = parseFixed(this.amount, nativeTokenDecimals)
    } catch {
      return false
    }
    if (amount.lte(BigNumber.from(0))) {
      return false
    }
    if (this.balance && parseFloat(this.amount) > parseFloat(this.balance)) {
      return false
    }
    return true
  }

  get tokenSymbol(): string {
    return this.$store.state.currentRound.nativeTokenSymbol
  }

  get tokenLogo(): string {
    return getTokenLogo(this.tokenSymbol)
  }

  async contributeMatchingFunds() {
    this.step += 1
    this.signer = this.$store.state.currentUser.walletProvider.getSigner()
    const { nativeTokenAddress, nativeTokenDecimals } =
      this.$store.state.currentRound
    const token = new Contract(nativeTokenAddress, ERC20, this.signer)
    const amount = parseFixed(this.amount, nativeTokenDecimals)
    try {
      await waitForTransaction(
        //TODO: update to take factory address as a parameter from the route props, default to env. variable
        token.transfer(factory.address, amount),
        (hash) => (this.transferTxHash = hash)
      )
    } catch (error) {
      this.transferTxError = error.message
      if (
        error.message.indexOf('Nonce too high') >= 0 &&
        process.env.NODE_ENV === 'development'
      ) {
        this.transferTxError = 'Have you been buidling?? Reset your nonce! 🪄'
      }
      return
    }
    this.step += 1
  }
}
</script>

<style scoped lang="scss">
@import '../styles/vars';
@import '../styles/theme';

.contribution-form {
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  margin-top: $modal-space;
}

.btn-row {
  margin: $modal-space auto 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.close-btn {
  margin-top: $modal-space;
}

.vm--modal {
  background-color: transparent !important;
}

.modal-body {
  background-color: var(--bg-primary-color);
  padding: $modal-space;
  box-shadow: var(--box-shadow);
  text-align: left;

  .loader {
    margin: $modal-space auto;
  }
}

.balance-check {
  font-size: 14px;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 0.5rem;
}
.balance-check-warning {
  font-size: 14px;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 0.5rem;
  color: var(--attention-color);
}

.transaction-fee {
  opacity: 0.6;
  font-size: 14px;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 1rem;
}
</style>

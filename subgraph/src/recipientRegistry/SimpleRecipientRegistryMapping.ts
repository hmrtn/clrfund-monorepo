import {
    RecipientAdded,
    RecipientRemoved,
  } from '../../generated/templates/SimpleRecipientRegistry/SimpleRecipientRegistry'
  
import { Recipient } from '../../generated/schema'
import { removeRecipient } from '../RecipientMapping'

export function handleRecipientAdded(event: RecipientAdded): void {
    let recipientRegistryId = event.address.toHexString()

    let recipientId = event.params._recipientId.toHexString()
    let recipient = new Recipient(recipientId)

    recipient.requester = event.transaction.from.toHexString()
    recipient.recipientRegistry = recipientRegistryId
    recipient.recipientMetadata = event.params._metadata
    recipient.recipientIndex = event.params._index
    recipient.recipientAddress = event.params._recipient
    recipient.submissionTime = event.params._timestamp.toString()
    recipient.requestResolvedHash = event.transaction.hash
    recipient.createdAt = event.block.timestamp.toString()

    recipient.save()
    
}

export function handleRecipientRemoved(event: RecipientRemoved): void {
    let id = event.params._recipientId.toHexString()
    let timestamp = event.block.timestamp.toString()
    removeRecipient(id, timestamp)
}
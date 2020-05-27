/*
 *
 * Copyright 2018-present NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { command, metadata, option } from 'clime';
import { Deadline, MosaicRestrictionTransactionService } from 'symbol-sdk';

import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announceTransactions.options';
import { AddressAliasResolver } from '../../resolvers/address.resolver';
import { KeyResolver } from '../../resolvers/key.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { MosaicIdAliasResolver } from '../../resolvers/mosaic.resolver';
import { PasswordResolver } from '../../resolvers/password.resolver';
import { RestrictionValueResolver } from '../../resolvers/restrictionValue.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'm',
        description: 'Mosaic identifier or @alias being restricted.',
    })
    mosaicId: string;

    @option({
        flag: 'a',
        description: 'Address or @alias being restricted.',
    })
    targetAddress: string;

    @option({
        flag: 'k',
        description: 'Restriction key.',
    })
    restrictionKey: string;

    @option({
        flag: 'V',
        description: 'New restriction value.',
    })
    newRestrictionValue: string;
}

@command({
    description: 'Set a mosaic restriction to an specific address (requires internet)',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const profile = this.getProfile(options);
        const password = await new PasswordResolver().resolve(options);
        const account = profile.decrypt(password);
        const mosaicId = await new MosaicIdAliasResolver().resolve(options);
        const targetAddress = await new AddressAliasResolver().resolve(
            options,
            undefined,
            'Enter the restricted target address or alias:',
            'targetAddress',
        );
        const restrictionKey = await new KeyResolver().resolve(options, undefined, 'restrictionKey');
        const restrictionValue = await new RestrictionValueResolver().resolve(options);
        const maxFee = await new MaxFeeResolver().resolve(options);
        const signerMultisigInfo = await this.getSignerMultisigInfo(options);

        const repositoryFactory = profile.repositoryFactory;
        const restrictionMosaicHttp = repositoryFactory.createRestrictionMosaicRepository();
        const namespaceHttp = repositoryFactory.createNamespaceRepository();
        const mosaicRestrictionTransactionService = new MosaicRestrictionTransactionService(restrictionMosaicHttp, namespaceHttp);

        const mosaicAddressRestrictionTransaction = await mosaicRestrictionTransactionService
            .createMosaicAddressRestrictionTransaction(
                Deadline.create(),
                profile.networkType,
                mosaicId,
                restrictionKey,
                targetAddress,
                restrictionValue,
                maxFee,
            )
            .toPromise();

        const signatureOptions: TransactionSignatureOptions = {
            account,
            transactions: [mosaicAddressRestrictionTransaction],
            maxFee,
            signerMultisigInfo,
        };

        const signedTransactions = await this.signTransactions(signatureOptions, options);
        this.announceTransactions(options, signedTransactions);
    }
}

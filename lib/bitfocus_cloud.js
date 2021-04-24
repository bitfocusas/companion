const fs = require('fs')
const debug = require('debug')('lib/bitfocus-cloud')
const SCClient = require("socketcluster-client");

class BitfocusCloud {
	/**
	 * @param {EventEmitter} _system
	 */
	constructor(_system) {
		/** @type {EventEmitter} */
		this.system = _system;
		this.banks = [];

		debug('Constructing');
		this.connect();
	}

	async connect() {
		debug('Connecting');
		this.socket = SCClient.create({
			hostname: '127.0.0.1',
			port: 8001,
			secure: false,
			autoReconnectOptions: {
				initialDelay: 1000, //milliseconds
				randomness: 500, //milliseconds
				multiplier: 1.5, //decimal
				maxDelay: 20000 //milliseconds
			}
		});

		(async () => {
			while (1) {
				for await (let _event of this.socket.listener("connect")) {  // eslint-disable-line
					debug('Socket is connected')

					this.system.emit('db_get', 'bank', (banks) => {
						this.banks = banks;
			
						this.socket.transmitPublish('companion-banks:123-123-123-123', {
							type: 'full',
							data: banks
						});
					});			
				}
				await delay(1000);
			}
		})()

		this.system.on('graphics_bank_invalidate', (page, bank) => this.updateBank(page, bank));

		setImmediate(() => {
			this.system.emit('db_get', 'bank', (banks) => {
				this.banks = banks;
			});
		});
	}

	async updateBank(page, bank) {
		this.system.emit('db_get', 'bank', (banks) => {
			this.banks = banks;

			this.socket.transmitPublish('companion-banks:123-123-123-123', {
				type: 'single',
				page,
				bank,
				data: banks[page][bank]
			});
		});
	}
}

module.exports = (system) => new BitfocusCloud(system)

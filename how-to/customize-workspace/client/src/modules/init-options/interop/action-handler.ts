import type { Logger } from "../../../logger-shapes";

const LOGGER_GROUP = "InitOptionsInteropHandler";

interface RaiseIntentPayload {
	name: string;
	context: OpenFin.Context;
}

interface ShareContextPayload {
	contextGroup: string;
	context: OpenFin.Context;
}

let logger: Logger;

async function raiseIntent(payload: RaiseIntentPayload) {
	const brokerClient = fin.Interop.connectSync(fin.me.identity.uuid, {});
	logger.info(LOGGER_GROUP, `Received intent to raise. Intent Request ${JSON.stringify(payload, null, 4)}.`);
	await brokerClient.fireIntent(payload);
}

async function shareContext(payload: ShareContextPayload) {
	const brokerClient = fin.Interop.connectSync(fin.me.identity.uuid, {});
	const contextGroups = await brokerClient.getContextGroups();
	const targetContextGroup = contextGroups.find((group) => group.id === payload.contextGroup);
	if (targetContextGroup !== undefined) {
		await brokerClient.joinContextGroup(targetContextGroup.id);
		logger.info(
			LOGGER_GROUP,
			`Received context to send. Context Group ${targetContextGroup.id}. Context: ${JSON.stringify(
				payload.context,
				null,
				4
			)}`
		);
		await brokerClient.setContext(payload.context);
	}
}

export async function init(options: unknown, log: Logger) {
	logger = log;
	// the init function could be passed limits (e.g. only support the following intents or contexts. Only publish to the following context groups etc.)
	logger.info(LOGGER_GROUP, "The handler has been loaded");
}

export async function action(
	requestedAction: string,
	payload?: RaiseIntentPayload | ShareContextPayload
): Promise<void> {
	if (payload === undefined) {
		logger.warn(
			LOGGER_GROUP,
			`Actions passed to the module require a payload to be passed. Requested action: ${requestedAction} can not be fulfilled.`
		);
		return;
	}
	try {
		switch (requestedAction) {
			case "raise-intent": {
				await raiseIntent(payload as RaiseIntentPayload);
				break;
			}
			case "share-context": {
				await shareContext(payload as ShareContextPayload);
				break;
			}
		}
	} catch (error) {
		logger.error(LOGGER_GROUP, `Error trying to perform action ${requestedAction}.`, error);
	}
}

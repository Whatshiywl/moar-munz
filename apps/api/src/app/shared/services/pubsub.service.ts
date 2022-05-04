import { Injectable, OnModuleInit } from "@nestjs/common";
import { PubSub, Topic } from '@google-cloud/pubsub';
import { Subject } from "rxjs";
import { CheckBalanceObj, DeductObj, PlayPayload, PubSubAction, PubSubActionBody, PubSubActionObj, PubSubMessage, PubSubPayload, TransferCompleteObj, TransferCompletePayload, TransferMessage, TransferObj, TransferPayload, WinPayload } from "@moar-munz/api-interfaces";
import { filter, map } from "rxjs/operators";

@Injectable()
export class PubSubService implements OnModuleInit {
  readonly on$: Subject<PubSubMessage>;

  private readonly projectId = 'bubaxi';
  private readonly topicNameOrId = 'moar-munz';
  private readonly subscriptionName = 'moar-munz-sub';

  private readonly pubsub: PubSub;
  private topic: Topic;

  constructor() {
    this.pubsub = new PubSub({
      apiEndpoint: 'localhost:8085',
      projectId: this.projectId
    });
    this.on$ = new Subject<PubSubMessage>();
  }

  async onModuleInit() {
    this.topic = await this.getTopic(this.topicNameOrId);

    const subscription = await this.getSubscription(this.subscriptionName);

    subscription.on('message', (message: { data: Buffer, ack: () => void }) => {
      const payload = JSON.parse(message.data.toString()) as PubSubPayload;
      if (!payload || !payload.action) return console.warn('Discarding invalid payload', payload);
      this.on$.next({ payload, ack: message.ack.bind(message) });
    });

    subscription.on('error', error => {
      console.error('Received error:', error);
    });
  }

  changeAction<T extends PubSubPayload>(
    payload: PubSubPayload,
    action: T['action']
  ): T {
    return { ...payload, ...{ action } as T };
  }

  addActions(payload: PubSubPayload, actions: PubSubActionObj) {
    const newActions = { ...payload.actions, ...actions };
    return { action: payload.action, actions: newActions };
  }

  publishPlay(playerId: string, forceUnlock: boolean = false) {
    const payload = this.getPlayPayload(playerId, forceUnlock);
    return this.publish(payload);
  }

  getPlayPayload(playerId: string, forceUnlock: boolean = false) {
    const payload: PlayPayload = {
      action: 'play',
      actions: {
        play: {
          body: { playerId, forceUnlock }
        }
      }
    };
    return payload;
  }

  publishTransfer(from: string, to: string, amount: number, callback: string, actions: PubSubActionObj = { }) {
    const payload: PubSubPayload<TransferObj | TransferCompleteObj, 'transfer'> = {
      action: 'transfer',
      actions: {
        ...actions,
        transfer: {
          body: { from, to, amount }
        },
        'transfer-complete': {
          body: { from, to, amount },
          callback
        }
      }
    };
    return this.publish(payload);
  }

  publishDeduct(playerId: string, amount: number, callback: string, actions: PubSubActionObj = { }, origin?: string) {
    const payload: PubSubPayload<DeductObj | CheckBalanceObj, 'deduct'> = {
      action: 'deduct',
      actions: {
        ...actions,
        deduct: {
          body: { playerId, amount }
        },
        'check-balance': {
          body: { playerId, amount, origin },
          callback
        }
      }
    };
    return this.publish(payload);
  }

  publishWin(playerId: string) {
    const payload: WinPayload = {
      action: 'win',
      actions: {
        win: {
          body: { playerId }
        }
      }
    }
    return this.publish(payload);
  }

  on<T extends PubSubMessage>(action: string) {
    return this.on$.pipe(
      filter(message => message.payload.action === action),
      map(message => message as T)
    );
  }

  publish<A extends string, B extends PubSubActionBody, C extends string, P = PubSubPayload<PubSubActionObj<PubSubAction<B, C>, A>>>(payload: P) {
    const data = Buffer.from(JSON.stringify({ id: Math.random().toString(16).substring(2), ...payload }));
    return this.topic.publishMessage({ data });
  }

  private async getTopic(name: string) {
    try {
      const [topic] = await this.pubsub.createTopic(name);
      console.log(`Topic ${topic.name} created.`);
      return topic;
    } catch (error) {
      if (error.code === 6) {
        const [topics] = await this.pubsub.getTopics();
        const regex = new RegExp(`/${name}$`);
        const topic = topics.find(topic => topic.name.match(regex));
        console.log(`Topic ${topic.name} retrieved.`);
        return topic;
      } else {
        console.log(error);
      }
    }
  }

  private async getSubscription(name: string) {
    try {
      const [subscription] = await this.topic.createSubscription(name);
      console.log(`Subscription ${subscription.name} created.`);
      return subscription;
    } catch (error) {
      if (error.code === 6) {
        const [subscriptions] = await this.topic.getSubscriptions();
        const regex = new RegExp(`/${name}$`);
        const subscription = subscriptions.find(sub => sub.name.match(regex));
        console.log(`Subscription ${subscription.name} retrieved.`);
        return subscription;
      } else {
        console.log(error);
      }
    }
  }

}

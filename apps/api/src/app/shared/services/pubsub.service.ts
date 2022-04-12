import { OnModuleInit } from "@nestjs/common";
import { PubSub, Topic } from '@google-cloud/pubsub';
import { Subject } from "rxjs";

type Actions = 'play' | 'prompt';

interface PubSubPayload<T extends Actions> {
  action: T,
  playerId: string
}

export interface PubSubMessage<T extends Actions> {
  payload: PubSubPayload<T>,
  ack: () => void
}

export class PubSubService implements OnModuleInit {
  readonly onPlayMessage$: Subject<PubSubMessage<'play'>>;

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
    this.onPlayMessage$ = new Subject<PubSubMessage<'play'>>();
  }

  async onModuleInit() {
    this.topic = await this.getTopic(this.topicNameOrId);

    const subscription = await this.getSubscription(this.subscriptionName);

    subscription.on('message', message => {
      const payload = JSON.parse(message.data.toString());
      if (!payload || !payload.action || !payload.playerId) {
        console.warn('Discarding invalid payload', message.payload);
      }
      switch (payload.action) {
        case 'play':
          this.onPlayMessage$.next({ payload, ack: message.ack.bind(message) });
          break;
      }
    });

    subscription.on('error', error => {
      console.error('Received error:', error);
    });
  }

  publishPlay(playerId: string) {
    return this.publish({ action: 'play', playerId });
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

  private publish<T extends Actions>(payload: PubSubPayload<T>) {
    const data = Buffer.from(JSON.stringify(payload));
    return this.topic.publishMessage({ data });
  }

}

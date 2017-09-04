import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import * as ScrambleWorker from 'worker-loader?name=./static/js/scramble-worker.[hash:8].js!./scrambleWorker';

export class ScrambleService {
  private worker: Worker;
  private requestedScrambles$: Subject<MessageEvent>;
  private nextCommandId = 0;

  constructor() {
    this.worker = new ScrambleWorker();

    this.requestedScrambles$ = new Subject();

    this.worker.addEventListener(
      'message',
      (e: MessageEvent) => {
        this.requestedScrambles$.next(e);
      },
      false
    );
  }

  getScramble(scrambler: string): Observable<string> {
    const commandId = this.nextCommandId;
    this.nextCommandId++;

    this.worker.postMessage({
      command: 'getRandomScramble',
      commandId: commandId,
      eventName: scrambler
    });

    return this.requestedScrambles$
      .asObservable()
      .filter(e => e.data.commandId === commandId)
      .take(1)
      .map(e => {
        // Replace megaminx scrambles' <br> with newline
        return e.data.scramble.scrambleString.replace(/<br>/g, '\n');
      });
  }
}
import resolve from 'redux-duckling';
import {
  createStore,
  applyMiddleware,
} from 'redux';
import thunk from 'redux-thunk';
import promise from 'redux-promise';
import ServiceHelper from '../../../helpers/service';
import Service from '../../../../src/services/storage';

import asyncBehavior from '../../../../src/lib/ducklings/async-behavior';
import factory from '../../../../src/ducklings/app/change-secret';

const namespace = 'crypto-watch';
const error = new Error('FAIL');
const settings = {};
const secret = 'secret';

let service;
let serviceHelper;
let duckling;
let app;
let reducer;
let store;
let changes = [];
let initialState;

const record = (store) => (next) => (action) => {
  const result = next(action);
  changes.push({
    action,
    state: store.getState(),
  });
  return result;
};

describe('ducklings', () => {
  describe('app', () => {
    describe('create', () => {
      beforeEach(() => {
        service = new Service(namespace);
        serviceHelper = new ServiceHelper(service, {
          changeSecret: true,
        });
        duckling = factory(service);
        ({app, reducer} = resolve(duckling));
        store = createStore(reducer, applyMiddleware(thunk, promise, record));
        initialState = store.getState();
      });

      it('should have the correct type string', () => {
        duckling.is.should.eql('ducklings/app/change-secret');
      });

      it('should extend asyncBehavior', () => {
        duckling[0].should.equal(asyncBehavior);
      });

      describe('initial state', () => {
        it('should not be complete', () => {
          app.isComplete(initialState).should.be.false;
        });
      });

      describe('then submit', () => {
        describe('with no error', () => {
          beforeEach(async () => {
            serviceHelper.reset();
            serviceHelper.setResults([{
              success: void 0,
            }]);
            changes = [];
            await store.dispatch(app.submit(secret, settings));
          });

          it('should create the settings', () => {
            service.changeSecret.should.have.been.calledWith(secret, settings);
          });

          it('should go through the correct changes', () => {
            changes.length.should.eql(2);
            changes[0].action.type.should.eql(app.start.toString());
            app.isComplete(changes[0].state).should.be.false;
            changes[1].action.type.should.eql(app.complete.toString());
            app.isComplete(changes[1].state).should.be.true;
          });
        });

        describe('with an error', () => {
          beforeEach(async () => {
            serviceHelper.reset();
            serviceHelper.setResults([{
              error,
            }]);
            changes = [];
            await store.dispatch(app.submit(secret, settings));
          });

          it('should try to create the settings', () => {
            service.changeSecret.should.have.been.calledWith(secret, settings);
          });

          it('should go through the correct changes', () => {
            changes.length.should.eql(2);
            changes[0].action.type.should.eql(app.start.toString());
            app.isComplete(changes[0].state).should.be.false;
            changes[1].action.type.should.eql(app.complete.toString());
            changes[1].action.payload.should.eql(error);
            changes[1].action.error.should.be.true;
            app.isComplete(changes[1].state).should.be.false;
          });
        });
      });
    });
  });
});

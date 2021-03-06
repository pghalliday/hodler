import aes from 'crypto-js/aes';
import sha256 from 'crypto-js/sha256';
import localforage from 'localforage';
import Service from '../../../src/services/storage';

const namespace = 'test';
const secret = 'this is a secret';
const secretKey = sha256(secret).toString();
const otherSecret = 'this is another secret';
const otherSecretKey = sha256(otherSecret).toString();
const newSecret = 'this is a new secret';
const newSecretKey = sha256(newSecret).toString();
const incorrectSecret = 'this is not a secret';

const empty = 'empty';
const existing = 'existing';
const other = 'other';
const updated = 'updated';

const encryptedEmpty = aes.helpers.encrypt(JSON.stringify(empty), secret);
const encryptedExisting = aes.helpers.encrypt(
  JSON.stringify(existing),
  secret
);
const reencryptedExisting = aes.helpers.encrypt(
  JSON.stringify(existing),
  newSecret
);
const encryptedOther = aes.helpers.encrypt(JSON.stringify(other), otherSecret);
const encryptedUpdated = aes.helpers.encrypt(JSON.stringify(updated), secret);

const emptyData = {
  [namespace]: {
    [secretKey]: encryptedEmpty,
  },
};
const existingData = {
  [namespace]: {
    [secretKey]: encryptedExisting,
    [otherSecretKey]: encryptedOther,
  },
};
const reencryptedExistingData = {
  [namespace]: {
    [newSecretKey]: reencryptedExisting,
    [otherSecretKey]: encryptedOther,
  },
};
const deletedExistingData = {
  [namespace]: {
    [otherSecretKey]: encryptedOther,
  },
};
const updatedData = {
  [namespace]: {
    [secretKey]: encryptedUpdated,
    [otherSecretKey]: encryptedOther,
  },
};

let service;
let length;
let data;

describe('service', () => {
  beforeEach(() => {
    service = new Service(namespace);
  });

  describe('with no supported storage methods', () => {
    beforeEach(() => {
      localforage.helpers.reset();
      localforage.helpers.setNextError(new Error('FAIL'));
    });

    describe('#initialize', () => {
      it('should fail', () => {
        return service.initialize().should.be.rejectedWith('FAIL');
      });
    });
  });

  describe('with no storage entries', () => {
    beforeEach(() => {
      localforage.helpers.reset();
    });

    describe('#initialize', () => {
      beforeEach(async () => {
        length = await service.initialize();
      });

      it('should return the length 0', () => {
        length.should.eql(0);
      });

      describe('then', () => {
        describe('#create', () => {
          beforeEach(async () => {
            length = await service.create(secret, empty);
          });

          it('should return the new length of 1', () => {
            length.should.eql(1);
          });

          it('should store the encrypted data', () => {
            localforage.helpers.getData().should.eql(emptyData);
          });
        });
      });
    });
  });

  describe('with 2 existing storage entries', () => {
    beforeEach(() => {
      localforage.helpers.reset(existingData);
    });

    describe('#initialize', () => {
      beforeEach(async () => {
        length = await service.initialize();
      });

      it('should return the length 2', () => {
        length.should.eql(2);
      });

      describe('then', () => {
        describe('#clear', () => {
          beforeEach(async () => {
            length = await service.clear();
          });

          it('should return the new length of 0', () => {
            length.should.eql(0);
          });

          it('should remove all the keys', () => {
            localforage.helpers.getData().should.eql({});
          });
        });

        describe('#unlock', () => {
          describe('with an incorrect secret', () => {
            it('should fail', () => {
              (() => {
                service.unlock(incorrectSecret);
              }).should.throw('unknown secret');
            });
          });

          describe('with the correct secret', () => {
            beforeEach(() => {
              data = service.unlock(secret);
            });

            it('should resolve to the data', () => {
              data.should.eql(existing);
            });

            describe('then', () => {
              describe('#changeSecret', () => {
                beforeEach(() => {
                  return service.changeSecret(newSecret, existing);
                });

                it('should re-encrypt the data', () => {
                  localforage.helpers.getData()
                  .should.eql(reencryptedExistingData);
                });
              });

              describe('#delete', () => {
                beforeEach(async () => {
                  length = await service.delete();
                });

                it('should return the new length of 1', () => {
                  length.should.eql(1);
                });

                it('should remove the entry from storage', () => {
                  localforage.helpers.getData()
                  .should.eql(deletedExistingData);
                });
              });

              describe('#update', () => {
                beforeEach(() => {
                  return service.update(updated);
                });

                it('should update the entry in storage', () => {
                  localforage.helpers.getData()
                  .should.eql(updatedData);
                });
              });
            });
          });
        });
      });
    });
  });
});

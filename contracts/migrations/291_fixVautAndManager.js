/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.manager.upgrade();
  e.vault.upgrade();
};

module.exports = {
  migrate,
};

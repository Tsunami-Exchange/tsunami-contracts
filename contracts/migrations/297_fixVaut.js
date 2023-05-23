/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.vault.upgrade();
};

module.exports = {
  migrate,
};

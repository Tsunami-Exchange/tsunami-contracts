/**
 * @type {function(Environment)}
 */
const migrate = async (e) => {
  e.orders.upgrade();
};

module.exports = {
  migrate,
};

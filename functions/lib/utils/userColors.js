"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomUserColor = exports.USER_COLOR_NAMES = exports.USER_COLORS = void 0;
exports.USER_COLORS = {
    mauve: '#B8899C',
    slate: '#7E8FB2',
    clay: '#C4917E',
    teal: '#5A9E9E',
    plum: '#A07BA0',
    ochre: '#C4B07A',
    sage: '#8AA67E',
    coral: '#C98E8E',
    indigo: '#7A7AB2',
    wine: '#B87A8E',
    bronze: '#B2A07A',
    steel: '#8A9EB2',
};
exports.USER_COLOR_NAMES = Object.keys(exports.USER_COLORS);
const getRandomUserColor = () => {
    const index = Math.floor(Math.random() * exports.USER_COLOR_NAMES.length);
    return exports.USER_COLOR_NAMES[index];
};
exports.getRandomUserColor = getRandomUserColor;
//# sourceMappingURL=userColors.js.map
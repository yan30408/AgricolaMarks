export const imageUrl = {
  Fields: `${process.env.PUBLIC_URL}/images/Fields.png`,
  Pastures: `${process.env.PUBLIC_URL}/images/Fence.png`,
  Grain: `${process.env.PUBLIC_URL}/images/Grain.png`,
  Vegetables: `${process.env.PUBLIC_URL}/images/Vege.png`,
  Sheep: `${process.env.PUBLIC_URL}/images/Sheep.png`,
  "Wild boar": `${process.env.PUBLIC_URL}/images/Boar.png`,
  Cattle: `${process.env.PUBLIC_URL}/images/Cattle.png`,
  "Unused Spaces": `${process.env.PUBLIC_URL}/images/Space.png`,
  Stable: `${process.env.PUBLIC_URL}/images/Stable.png`,
  "Wood Rooms": `${process.env.PUBLIC_URL}/images/Room_Wood.png`,
  "Clay Rooms": `${process.env.PUBLIC_URL}/images/Room_Clay.png`,
  "Stone Rooms": `${process.env.PUBLIC_URL}/images/Room_Stone.png`,
  Family: `${process.env.PUBLIC_URL}/images/Family.png`,
  Beggar: `${process.env.PUBLIC_URL}/images/Beggar.png`,
  Improvement: `${process.env.PUBLIC_URL}/images/Improvement.png`,
  Bonus: `${process.env.PUBLIC_URL}/images/Bonus.png`
};

export const fixedButtonData = [
  {
    id: "Fields",
    labels: ["0-1", "2", "3", "4", "5+"]
  },
  {
    id: "Pastures",
    labels: ["0", "1", "2", "3", "4+"]
  },
  {
    id: "Grain",
    labels: ["0", "1-3", "4-5", "6-7", "8+"]
  },
  {
    id: "Vegetables",
    labels: ["0", "1", "2", "3", "4+"]
  },
  {
    id: "Sheep",
    labels: ["0", "1-3", "4-5", "6-7", "8+"]
  },
  {
    id: "Wild boar",
    labels: ["0", "1-2", "3-4", "5-6", "7+"]
  },
  {
    id: "Cattle",
    labels: ["0", "1", "2-3", "4-5", "6+"]
  }
];

export const linearButtonData = [
  {
    id: "Stable",
    beginIndex: 0,
    endIndex: 4,
    point: 1
  },
  {
    id: "Unused Spaces",
    beginIndex: 0,
    endIndex: 13,
    point: -1
  },
  {
    id: "Rooms",
    beginIndex: 2,
    endIndex: 15
  },
  {
    id: "Family",
    beginIndex: 2,
    endIndex: 5,
    point: 3
  },
  {
    id: "Improvement",
    beginIndex: 0,
    endIndex: 30,
    point: 1
  },
  {
    id: "Bonus",
    beginIndex: -10,
    endIndex: 50,
    point: 1
  },
  {
    id: "Beggar",
    beginIndex: 0,
    endIndex: 10,
    point: -3
  }
];

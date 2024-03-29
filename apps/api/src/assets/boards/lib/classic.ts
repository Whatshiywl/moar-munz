import { RawBoard } from '@moar-munz/api-interfaces';

export const classic: RawBoard = {
  tiles: [
    // FIRST LINE
    {
      name: "Start",
      type: "start",
      color: "grey"
    },
    {
      name: "Mediterranean Av",
      type: "deed",
      color: "brown",
      level: 0,
      price: 60,
      rent: [2, 10, 30, 90, 160, 250],
      building: 50
    },
    {
      name: "Chance",
      type: "chance",
      color: "grey"
    },
    {
      name: "Baltic Av",
      type: "deed",
      color: "brown",
      level: 0,
      price: 60,
      rent: [4, 20, 60, 180, 320, 450],
      building: 50
    },
    {
      name: "Telecom Company",
      type: "company",
      color: "grey",
      price: 150,
      multiplier: 40
    },
    {
      name: "First Rail",
      type: "railroad",
      color: "grey",
      level: 0,
      price: 200,
      rent: [150, 300, 600, 1200]
    },
    {
      name: "Oriental Av",
      type: "deed",
      color: "deepskyblue",
      level: 0,
      price: 100,
      rent: [6, 30, 90, 270, 400, 550],
      building: 50
    },
    {
      name: "Chance",
      type: "chance",
      color: "grey"
    },
    {
      name: "Vermont Av",
      type: "deed",
      color: "deepskyblue",
      level: 0,
      price: 100,
      rent: [6, 30, 90, 270, 400, 550],
      building: 50
    },
    {
      name: "Connecticut Av",
      type: "deed",
      color: "deepskyblue",
      level: 0,
      price: 120,
      rent: [8, 40, 100, 300, 450, 600],
      building: 50
    },

    // SECOND LINE
    {
      name: "Prison",
      type: "prison",
      color: "grey"
    },
    {
      name: "St. Charles Pl",
      type: "deed",
      color: "darkviolet",
      level: 0,
      price: 140,
      rent: [10, 50, 150, 450, 625, 750],
      building: 100
    },
    {
      name: "Eletric Company",
      type: "company",
      color: "grey",
      price: 200,
      multiplier: 50
    },
    {
      name: "States Av",
      type: "deed",
      color: "darkviolet",
      level: 0,
      price: 140,
      rent: [10, 50, 150, 450, 625, 750],
      building: 100
    },
    {
      name: "Virginia Av",
      type: "deed",
      color: "darkviolet",
      level: 0,
      price: 160,
      rent: [12, 60, 180, 500, 700, 900],
      building: 100
    },
    {
      name: "Second Railroad",
      type: "railroad",
      color: "grey",
      level: 0,
      price: 200,
      rent: [150, 300, 600, 1200]
    },
    {
      name: "St. James Pl",
      type: "deed",
      color: "orange",
      level: 0,
      price: 180,
      rent: [14, 70, 200, 550, 750, 950],
      building: 100
    },
    {
      name: "Chance",
      type: "chance",
      color: "grey"
    },
    {
      name: "Tennessee Av",
      type: "deed",
      color: "orange",
      level: 0,
      price: 180,
      rent: [14, 70, 200, 550, 750, 950],
      building: 100
    },
    {
      name: "New York Av",
      type: "deed",
      color: "orange",
      level: 0,
      price: 200,
      rent: [16, 80, 220, 600, 800, 1000],
      building: 100
    },

    // THIRD LINE
    {
      name: "World Cup",
      type: "worldcup",
      color: "grey"
    },
    {
      name: "Kentucky Av",
      type: "deed",
      color: "red",
      level: 0,
      price: 220,
      rent: [18, 90, 250, 700, 875, 1050],
      building: 150
    },
    {
      name: "Chance",
      type: "chance",
      color: "grey"
    },
    {
      name: "Indiana Av",
      type: "deed",
      color: "red",
      level: 0,
      price: 220,
      rent: [18, 90, 250, 700, 875, 1050],
      building: 150
    },
    {
      name: "Illinois Av",
      type: "deed",
      color: "red",
      level: 0,
      price: 240,
      rent: [20, 100, 300, 750, 925, 1100],
      building: 150
    },
    {
      name: "Third Rail",
      type: "railroad",
      color: "grey",
      level: 0,
      price: 200,
      rent: [150, 300, 600, 1200]
    },
    {
      name: "Atlantic Av",
      type: "deed",
      color: "yellow",
      level: 0,
      price: 260,
      rent: [22, 110, 330, 800, 975, 1150],
      building: 150
    },
    {
      name: "Ventnor Av",
      type: "deed",
      color: "yellow",
      level: 0,
      price: 260,
      rent: [22, 110, 330, 800, 975, 1150],
      building: 150
    },
    {
      name: "Water Works",
      type: "company",
      color: "grey",
      price: 200,
      multiplier: 50
    },
    {
      name: "Marvin Gardens",
      type: "deed",
      color: "yellow",
      level: 0,
      price: 280,
      rent: [24, 120, 360, 850, 1025, 1200],
      building: 150
    },
    // FOURTH LINE
    {
      name: "World Tour",
      type: "worldtour",
      color: "grey",
      cost: 50
    },
    {
      name: "Pacific Av",
      type: "deed",
      color: "forestgreen",
      level: 0,
      price: 300,
      rent: [26, 130, 390, 900, 1100, 1275],
      building: 200
    },
    {
      name: "North Caroline Av",
      type: "deed",
      color: "forestgreen",
      level: 0,
      price: 300,
      rent: [26, 130, 390, 900, 1100, 1275],
      building: 200
    },
    {
      name: "Chance",
      type: "chance",
      color: "grey"
    },
    {
      name: "Pennsylvania Av",
      type: "deed",
      color: "forestgreen",
      level: 0,
      price: 320,
      rent: [28, 150, 450, 1000, 1200, 1400],
      building: 200
    },
    {
      name: "Fourth Rail",
      type: "railroad",
      color: "grey",
      level: 0,
      price: 200,
      rent: [150, 300, 600, 1200]
    },
    {
      name: "Freedom Oil",
      type: "company",
      color: "grey",
      price: 200,
      multiplier: 50
    },
    {
      name: "Park Pl",
      type: "deed",
      color: "blue",
      level: 0,
      price: 350,
      rent: [35, 175, 500, 1100, 1300, 1500],
      building: 200
    },
    {
      name: "Income tax",
      type: "tax",
      color: "grey",
      tax: 0.1
    },
    {
      name: "Broadwalk",
      type: "deed",
      color: "blue",
      level: 0,
      price: 400,
      rent: [50, 200, 600, 1400, 1700, 2000],
      building: 200
    }
  ]
};

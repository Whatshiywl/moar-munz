import { RawBoard } from '@moar-munz/api-interfaces';

export const westeros: RawBoard = {
  tiles: [
    // FIRST LINE
    {
      name: "Start",
      type: "start",
      color: "grey"
    },
    {
      name: "Craster's Keep",
      type: "deed",
      color: "brown",
      level: 0,
      price: 60,
      rent: [2, 10, 30, 90, 160, 250],
      building: 50
    },
    {
      name: "Valar Morghulis",
      type: "chance",
      color: "grey"
    },
    {
      name: "The Fist of the First Men",
      type: "deed",
      color: "brown",
      level: 0,
      price: 60,
      rent: [4, 20, 60, 180, 320, 450],
      building: 50
    },
    {
      name: "The Wall",
      type: "company",
      color: "grey",
      price: 150,
      multiplier: 40
    },
    {
      name: "The Kingsroad",
      type: "railroad",
      color: "grey",
      level: 0,
      price: 200,
      rent: [150, 300, 600, 1200]
    },
    {
      name: "Castle Black",
      type: "deed",
      color: "deepskyblue",
      level: 0,
      price: 100,
      rent: [6, 30, 90, 270, 400, 550],
      building: 50
    },
    {
      name: "Valar Dohaeris",
      type: "chance",
      color: "grey"
    },
    {
      name: "White Harbor",
      type: "deed",
      color: "deepskyblue",
      level: 0,
      price: 100,
      rent: [6, 30, 90, 270, 400, 550],
      building: 50
    },
    {
      name: "Winterfell",
      type: "deed",
      color: "deepskyblue",
      level: 0,
      price: 120,
      rent: [8, 40, 100, 300, 450, 600],
      building: 50
    },

    // SECOND LINE
    {
      name: "Prision",
      type: "prision",
      color: "grey"
    },
    {
      name: "Harrenhal",
      type: "deed",
      color: "darkviolet",
      level: 0,
      price: 140,
      rent: [10, 50, 150, 450, 625, 750],
      building: 100
    },
    {
      name: "Crossroads Inn",
      type: "company",
      color: "grey",
      price: 200,
      multiplier: 50
    },
    {
      name: "Bloody Gates",
      type: "deed",
      color: "darkviolet",
      level: 0,
      price: 140,
      rent: [10, 50, 150, 450, 625, 750],
      building: 100
    },
    {
      name: "The Eyrie",
      type: "deed",
      color: "darkviolet",
      level: 0,
      price: 160,
      rent: [12, 60, 180, 500, 700, 900],
      building: 100
    },
    {
      name: "The High Road",
      type: "railroad",
      color: "grey",
      level: 0,
      price: 200,
      rent: [150, 300, 600, 1200]
    },
    {
      name: "Dragonstone",
      type: "deed",
      color: "orange",
      level: 0,
      price: 180,
      rent: [14, 70, 200, 550, 750, 950],
      building: 100
    },
    {
      name: "Valar Morghulis",
      type: "chance",
      color: "grey"
    },
    {
      name: "Storm's End",
      type: "deed",
      color: "orange",
      level: 0,
      price: 180,
      rent: [14, 70, 200, 550, 750, 950],
      building: 100
    },
    {
      name: "King's Landing",
      type: "deed",
      color: "orange",
      level: 0,
      price: 200,
      rent: [16, 80, 220, 600, 800, 1000],
      building: 100
    },

    // THIRD LINE
    {
      name: "Tournment",
      type: "worldcup",
      color: "grey"
    },
    {
      name: "Cider Hall",
      type: "deed",
      color: "red",
      level: 0,
      price: 220,
      rent: [18, 90, 250, 700, 875, 1050],
      building: 150
    },
    {
      name: "Valar Dohaeris",
      type: "chance",
      color: "grey"
    },
    {
      name: "Horn Hill",
      type: "deed",
      color: "red",
      level: 0,
      price: 220,
      rent: [18, 90, 250, 700, 875, 1050],
      building: 150
    },
    {
      name: "High Garden",
      type: "deed",
      color: "red",
      level: 0,
      price: 240,
      rent: [20, 100, 300, 750, 925, 1100],
      building: 150
    },
    {
      name: "The Rose Road",
      type: "railroad",
      color: "grey",
      level: 0,
      price: 200,
      rent: [150, 300, 600, 1200]
    },
    {
      name: "Kingsgrave",
      type: "deed",
      color: "yellow",
      level: 0,
      price: 260,
      rent: [22, 110, 330, 800, 975, 1150],
      building: 150
    },
    {
      name: "Old Town",
      type: "deed",
      color: "yellow",
      level: 0,
      price: 260,
      rent: [22, 110, 330, 800, 975, 1150],
      building: 150
    },
    {
      name: "The Citadel",
      type: "company",
      color: "grey",
      price: 200,
      multiplier: 50
    },
    {
      name: "Sunspear",
      type: "deed",
      color: "yellow",
      level: 0,
      price: 280,
      rent: [24, 120, 360, 850, 1025, 1200],
      building: 150
    },
    // FOURTH LINE
    {
      name: "The Three-Eyed Raven",
      type: "worldtour",
      color: "grey",
      cost: 50
    },
    {
      name: "Pyke",
      type: "deed",
      color: "forestgreen",
      level: 0,
      price: 300,
      rent: [26, 130, 390, 900, 1100, 1275],
      building: 200
    },
    {
      name: "The Twins",
      type: "deed",
      color: "forestgreen",
      level: 0,
      price: 300,
      rent: [26, 130, 390, 900, 1100, 1275],
      building: 200
    },
    {
      name: "Valar Morghulis",
      type: "chance",
      color: "grey"
    },
    {
      name: "Riverrun",
      type: "deed",
      color: "forestgreen",
      level: 0,
      price: 320,
      rent: [28, 150, 450, 1000, 1200, 1400],
      building: 200
    },
    {
      name: "The Gold Road",
      type: "railroad",
      color: "grey",
      level: 0,
      price: 200,
      rent: [150, 300, 600, 1200]
    },
    {
      name: "The Golden Tooth",
      type: "company",
      color: "grey",
      price: 200,
      multiplier: 50
    },
    {
      name: "Lannisport",
      type: "deed",
      color: "blue",
      level: 0,
      price: 350,
      rent: [35, 175, 500, 1100, 1300, 1500],
      building: 200
    },
    {
      name: "Inheritance Tax",
      type: "tax",
      color: "grey",
      tax: 0.1
    },
    {
      name: "Casterly Rock",
      type: "deed",
      color: "blue",
      level: 0,
      price: 400,
      rent: [50, 200, 600, 1400, 1700, 2000],
      building: 200
    }
  ]
}

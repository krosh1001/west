import Card from "./Card.js";
import Game from "./Game.js";
import TaskQueue from "./TaskQueue.js";
import SpeedRate from "./SpeedRate.js";

class Creature extends Card {
	constructor(name, maxPower, image) {
		super(name, maxPower, image);
	}

	getDescriptions() {
		return [getCreatureDescription(this), ...super.getDescriptions()];
	}
}

// Отвечает является ли карта уткой.
function isDuck(card) {
	return card && card.quacks && card.swims ? true : false;
}

// Отвечает является ли карта собакой.
function isDog(card) {
	return card instanceof Dog ? true : false;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
	if (isDuck(card) && isDog(card)) {
		return "Утка-Собака";
	}
	if (isDuck(card)) {
		return "Утка";
	}
	if (isDog(card)) {
		return "Собака";
	}
	return "Существо";
}

class Gatling extends Creature {
	constructor(name = "Гатлинг", maxPower = 6, image) {
		super(name, maxPower, image);
	}

	attack(gameContext, continuation) {
		const taskQueue = new TaskQueue();

		const { currentPlayer, oppositePlayer, position, updateView } = gameContext;

		taskQueue.push((onDone) => this.view.showAttack(onDone));
		for (const oppositeCard of oppositePlayer.table) {
			taskQueue.push((onDone) => {
				this.dealDamageToCreature(this.currentPower, oppositeCard, gameContext, onDone);
			});
		}

		taskQueue.continueWith(continuation);
	}
}

class Duck extends Creature {
	constructor(name = "Мирная утка", maxPower = 2, image) {
		super(name, maxPower, image);
	}

	quacks() {
		console.log("quack");
	}

	swims() {
		console.log("float: both;");
	}
}

class Dog extends Creature {
	constructor(name = "Пес-бандит", maxPower = 3, image) {
		super(name, maxPower, image);
	}
}

class Lad extends Dog {
	constructor(name = "Браток", maxPower = 2, image) {
		super(name, maxPower, image);
	}

	static getInGameCount() {
		return this.inGameCount || 0;
	}

	static setInGameCount(value) {
		this.inGameCount = value;
	}

	doAfterComingIntoPlay(gameContext, continuation) {
		Lad.setInGameCount(Lad.getInGameCount() + 1);
		continuation();
	}

	doBeforeRemoving(gameContext, continuation) {
		Lad.setInGameCount(Lad.getInGameCount() - 1);
		continuation();
	}

	static getBonus() {
		const count = this.getInGameCount();
		return (count * (count + 1)) / 2;
	}

	modifyTakenDamage(value, fromCard, gameContext, continuation) {
		this.view.signalAbility(() => {
			continuation(Math.max(value - Lad.getBonus(), 0));
		});
	}

	modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
		this.view.signalAbility(() => {
			continuation(value + Lad.getBonus());
		});
	}

	getDescriptions() {
		return ["Чем их больше, тем они сильнее", ...super.getDescriptions()];
	}
}

class Trasher extends Dog {
	constructor(name = "Громила", maxPower = 5, image) {
		super(name, maxPower, image);
	}

	modifyTakenDamage(value, fromCard, gameContext, continuation) {
		this.view.signalAbility(() => {
			continuation(Math.max(value - 1, 0));
		});
	}

	getDescriptions() {
		return ["Получает меньше урона", ...super.getDescriptions()];
	}
}

const seriffStartDeck = [new Duck(), new Duck(), new Duck()];
const banditStartDeck = [new Lad(), new Lad()];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(4);

// Запуск игры.
game.play(false, (winner) => {
	alert("Победил " + winner.name);
});

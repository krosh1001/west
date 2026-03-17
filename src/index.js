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

	doBeforeRemoving(continuation) {
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

class Rogue extends Creature {
	static stealableAbilities = [
		"modifyDealedDamageToCreature",
		"modifyDealedDamageToPlayer",
		"modifyTakenDamage",
	];

	stolenAbilities = new Map();

	applyStolenAbilities(name, value, continuation, ...args) {
		let index = 0;
		let abilities = this.stolenAbilities.get(name) || [];

		const next = (currentValue) => {
			if (index === abilities.length) {
				continuation(currentValue);
				return;
			}

			const ability = abilities[index];
			index++;

			ability.call(this, currentValue, ...args, next);
		};

		next(value);
	}

	constructor(name = "Изгой", maxPower = 2, image) {
		super(name, maxPower, image);
	}

	doBeforeAttack(gameContext, continuation) {
		const { currentPlayer, oppositePlayer, position, updateView } = gameContext;

		this.view.signalAbility(() => {
			const oppositeCard = oppositePlayer.table[position];

			const prototype = Object.getPrototypeOf(oppositeCard);
			for (const ability of Rogue.stealableAbilities) {
				if (Object.hasOwn(prototype, ability)) {
					const oneTypeAbilities = this.stolenAbilities.get(ability) || [];
					oneTypeAbilities.push(prototype[ability]);
					delete prototype[ability];
					this.stolenAbilities.set(ability, oneTypeAbilities);
				}
			}

			updateView();
			continuation();
		});
	}

	modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
		this.applyStolenAbilities(
			"modifyDealedDamageToCreature",
			value,
			continuation,
			toCard,
			gameContext,
		);
	}

	modifyDealedDamageToPlayer(value, gameContext, continuation) {
		this.applyStolenAbilities("modifyDealedDamageToPlayer", value, continuation, gameContext);
	}

	modifyTakenDamage(value, fromCard, gameContext, continuation) {
		this.applyStolenAbilities("modifyTakenDamage", value, continuation, fromCard, gameContext);
	}

	getDescriptions() {
		return ["Похищает чужие способности", ...super.getDescriptions()];
	}
}

class Brewer extends Duck {
	constructor(name = "Пивовар", maxPower = 2, image) {
		super(name, maxPower, image);
	}

	doBeforeAttack(gameContext, continuation) {
		const { currentPlayer, oppositePlayer, position, updateView } = gameContext;

		this.view.signalAbility(() => {
			const cards = currentPlayer.table.concat(oppositePlayer.table);
			const taskQueue = new TaskQueue();

			for (const card of cards) {
				taskQueue.push((onDone) => {
					card.view.signalHeal(() => {
						card.maxPower += 1;
						card.currentPower += 2;
						card.updateView();
						onDone();
					});
				});
			}

			taskQueue.continueWith(continuation);
		});
	}

	getDescriptions() {
		return ["Варит пивко всем уткам", ...super.getDescriptions()];
	}
}

class PseudoDuck extends Dog {
	constructor(name = "Псевдоутка", maxPower = 3, image) {
		super(name, maxPower, image);
	}

	quacks() {
		console.log("quackkk... woof woff!!");
	}

	swims() {
		console.log("even dogs can swim!!");
	}

	getDescriptions() {
		return ["Это утка?...", ...super.getDescriptions()];
	}
}

class Nemo extends Creature {
	constructor(name = "Немо", maxPower = 4, image) {
		super(name, maxPower, image);
	}

	doBeforeAttack(gameContext, continuation) {
		const { currentPlayer, oppositePlayer, position, updateView } = gameContext;

		this.view.signalAbility(() => {
			const oppositeCard = oppositePlayer.table[position];

			const prototype = Object.getPrototypeOf(oppositeCard);
			Object.setPrototypeOf(this, prototype);

			this.updateView();
			this.doBeforeAttack(gameContext, continuation);
		});
	}
}

const sheriffStartDeck = [new Nemo()];
const banditStartDeck = [new Brewer(), new Brewer()];

const game = new Game(sheriffStartDeck, banditStartDeck);

SpeedRate.set(1.6);

game.play(false, (winner) => {
	alert("Победил " + winner.name);
});

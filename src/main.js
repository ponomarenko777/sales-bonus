/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const { discount, sale_price, quantity } = purchase;
  return sale_price * quantity * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;
  if (index === 0) {
    return 0.15 * profit;
  } else if (index === 1 || index === 2) {
    return 0.1 * profit;
  } else if (index === total - 1) {
    return 0;
  } else {
    // Для всех остальных
    return 0.05 * profit;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.purchase_records) ||
    !Array.isArray(data.products) ||
    data.sellers.length === 0 ||
    data.purchase_records.length === 0 ||
    data.products.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }
  // @TODO: Проверка наличия опций
  if (typeof options === "object" && options !== null) {
    const { calculateRevenue, calculateBonus } = options;

    if (
      !calculateRevenue ||
      !calculateBonus ||
      typeof calculateRevenue !== "function" ||
      typeof calculateBonus !== "function"
    ) {
      throw new Error("Чего-то не хватает");
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map((seller) => {
      return { ...seller };
    });
    // @TODO: Индексация продавцов и товаров для быстрого доступа

    const sellerIndex = sellerStats.reduce(
      (result, seller) => ({
        ...result,
        [seller.id]: seller,
      }),
      {}
    ); // Ключом будет id, значением — запись из sellerStats

    const productIndex = data.products.reduce(
      (result, product) => ({
        ...result,
        [product.sku]: product,
      }),
      {}
    ); // Ключом будет sku, значением — запись из data.products

    data.purchase_records.forEach((record) => {
      // Чек
      const seller = sellerIndex[record.seller_id]; // Продавец
      // Увеличить количество продаж
      if (seller.sales_count) {
        seller.sales_count = seller.sales_count + 1;
      } else {
        seller.sales_count = 1;
      }
      // Увеличить общую сумму всех продаж
      if (seller.revenue) {
        seller.revenue = seller.revenue + record.total_amount;
      } else {
        seller.revenue = record.total_amount;
      }

      // Расчёт прибыли для каждого товара
      record.items.forEach((item) => {
        const product = productIndex[item.sku]; // Товар
        // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
        const cost = product.purchase_price * item.quantity;
        // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
        const revenue = calculateRevenue(item, product);
        // Посчитать прибыль: выручка минус себестоимость
        const profit = revenue - cost;
        // Увеличить общую накопленную прибыль (profit) у продавца
        if (!seller.profit) {
          seller.profit = profit;
        } else {
          seller.profit = seller.profit + profit;
        }

        if (!seller.products_sold) {
          seller.products_sold = {};
        }

        // Учёт количества проданных товаров
        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = item.quantity;
        } else {
          seller.products_sold[item.sku] += item.quantity;
        }
        // По артикулу товара увеличить его проданное количество у продавца
      });
    });
    function compare(a, b) {
      if (a.profit > b.profit) return -1;
      if (a.profit < b.profit) return 1;
      return 0;
    }
    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort(compare);

    sellerStats.forEach((seller, index) => {
      seller.bonus = calculateBonus(index, sellerStats.length, seller);
      seller.top_products = Object.entries(seller.products_sold)
        .map((item) => {
          return { sku: item[0], quantity: item[1] };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });

    // @TODO: Назначение премий на основе ранжирования

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map((seller) => ({
      seller_id: seller.id, // Строка, идентификатор продавца
      name: `${seller.first_name} ${seller.last_name}`, // Строка, имя продавца
      revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
      profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
      sales_count: seller.sales_count, // Целое число, количество продаж продавца
      top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
      bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
    }));
  }
}

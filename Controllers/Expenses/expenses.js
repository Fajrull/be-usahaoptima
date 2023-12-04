const ReportModels = require("../../Models/scheme/Report");
const Expenses = require("../../Models/scheme/Shop_Expenses");

const createExpenses = async (req, res, next) => {
  const { expenseName, cost } = req.body;
  const token = req.tokenUser.data;

  try {
    const createDataPassing = {
      expense_name: expenseName,
      cost: cost,
      created_date: new Date(),
      updated_date: new Date().toISOString(),
      business_id: token.business_id,
    };

    const createData = await Expenses.create(createDataPassing);

    if (!createData) {
      res.status(400).json({
        message: "Gagal membuat data pengeluaran",
        statusText: "Gagal membuat data pengeluaran",
        statusCode: 400,
      });
    } else {
      // Dapatkan total_cost dari semua data di database
      const totalCosts = await Expenses.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$cost" },
          },
        },
      ]);

      // Set total_cost ke total biaya yang dihitung
      const newTotalCost = totalCosts.length > 0 ? totalCosts[0].total : 0;

      // Perbarui total_cost di semua data
      await Expenses.updateMany({}, { $set: { total_cost: newTotalCost } });

      // Buat data report
      const dataReport = {
        total_amount: cost,
        criteria: "pengeluaran",
        create_at: new Date(),
        report_id: createData._id,
        business_id: token.business_id,
      };

      await ReportModels.create(dataReport);

      res.status(200).json({
        message: "Berhasil membuat data pengeluaran",
        statusText: "Berhasil membuat data pengeluaran",
        statusCode: 200,
        data: { ...createData._doc, total_cost: newTotalCost },
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
      statusText: "Internal server error",
      statusCode: 500,
    });
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const token = req.tokenUser.data;
    const getDataExpenses = await Expenses.find({
      business_id: token.business_id,
    });

    res.status(200).json({
      message: "Berhasil mengambil data pengeluaran",
      statusText: "Berhasil mengambil data pengeluaran",
      statusCode: 200,
      data: getDataExpenses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
      statusText: "Internal server error",
      statusCode: 500,
    });
  }
};

const updateExpenses = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { expenseName, cost } = req.body;

    const existingExpenses = await Expenses.findById(id);

    const costDifference = cost - existingExpenses.cost;

    const newTotalCost = existingExpenses.total_cost + costDifference;

    const updateExpensesData = {
      expense_name: expenseName,
      cost: cost,
      total_cost: newTotalCost,
      updated_date: new Date().toISOString(),
    };

    const updateExpensesItem = await Expenses.findByIdAndUpdate(
      id,
      updateExpensesData,
      { new: true }
    );

    if (!updateExpensesItem) {
      res.status(404).json({
        message: "Data pengeluaran tidak ditemukan",
        statusText: "Data pengeluaran tidak ditemukan",
        statusCode: 404,
      });
    } else {
      // Dapatkan total_cost dari semua data di database
      const totalCosts = await Expenses.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$cost" },
          },
        },
      ]);

      // Set total_cost ke total biaya yang dihitung
      const newTotalCost = totalCosts.length > 0 ? totalCosts[0].total : 0;

      // Perbarui total_cost di semua data
      await Expenses.updateMany({}, { $set: { total_cost: newTotalCost } });

      // Update data report
      const reportUpdateData = {
        total_amount: cost,
      };

      await ReportModels.findOneAndUpdate(
        { report_id: updateExpensesItem._id },
        reportUpdateData,
        { new: true }
      );

      res.status(200).json({
        message: "Berhasil memperbarui data pengeluaran",
        statusText: "Berhasil memperbarui data pengeluaran",
        statusCode: 200,
        data: { ...updateExpensesItem._doc, total_cost: newTotalCost },
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
      statusText: "Internal server error",
      statusCode: 500,
    });
  }
};

const deleteExpenses = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleteExpensesData = await Expenses.findByIdAndDelete(id);

    if (!deleteExpensesData) {
      res.status(404).json({
        message: "Data pengeluaran tidak ditemukan",
        statusText: "Data pengeluaran tidak ditemukan",
        statusCode: 404,
      });
    } else {
      // Dapatkan total_cost dari semua data di database
      const totalCosts = await Expenses.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$cost" },
          },
        },
      ]);

      // Set total_cost ke total biaya yang dihitung
      const newTotalCost = totalCosts.length > 0 ? totalCosts[0].total : 0;

      // Hapus data report yang terkait
      await ReportModels.findOneAndDelete({
        report_id: deleteExpensesData._id,
      });

      // Perbarui total_cost di semua data
      await Expenses.updateMany({}, { $set: { total_cost: newTotalCost } });

      res.status(200).json({
        message: "Berhasil menghapus data pengeluaran",
        statusText: "Berhasil menghapus data pengeluaran",
        statusCode: 200,
        data: { deletedId: deleteExpensesData._id },
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
      statusText: "Internal server error",
      statusCode: 500,
    });
  }
};

const deleteAllExpenses = async (req, res, next) => {
  try {
    // Hapus semua data pengeluaran
    const deleteAllData = await Expenses.deleteMany({});

    // Hapus semua data report
    await ReportModels.deleteMany({});

    // Set total_cost ke 0 di semua data
    await Expenses.updateMany({}, { $set: { total_cost: 0 } });

    res.status(200).json({
      message: "Berhasil menghapus semua data pengeluaran",
      statusText: "Berhasil menghapus semua data pengeluaran",
      statusCode: 200,
      data: { deletedCount: deleteAllData.deletedCount },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
      statusText: "Internal server error",
      statusCode: 500,
    });
  }
};

module.exports = {
  createExpenses,
  getExpenses,
  updateExpenses,
  deleteExpenses,
  deleteAllExpenses,
};

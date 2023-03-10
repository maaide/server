import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  category: { type: String, required: true },
  description: { type: String },
  slug: { type: String, required: true, unique: true },
  image: { type: String },
  titleSeo: { type: String },
  descriptionSeo: { type: String }
}, {
  timestamps: true
})

const Category= mongoose.models.Category || mongoose.model('Category', categorySchema)

export default Category

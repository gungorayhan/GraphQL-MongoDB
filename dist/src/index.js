import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { connect, Types } from "mongoose";
import Book from "../models/book.js";
const MONGODB = "mongodb://127.0.0.1:27017/graphql-book";
const typeDefs = `#graphql

    type Book {
        _id:String,
        author:String,
        title:String,
        year:Int
    }

    input BookInput {
        author:String
        title:String
        year:Int
    }

    input BookFilter{
        ids:[ID!],
        author:String
        startDate:String
        endDate:String
    }

    input BookFiltersInput{
        filter:BookFilter
        limit:Int
    }

    type Query {
        getBook(ID:ID):Book!
        getBooks(limit:Int):[Book]
        books(input: BookFiltersInput):[Book]
    } 

    type Mutation{
        createBook(bookInput:BookInput):String!
        updateBook(ID:ID!,bookInput:BookInput):String!
        deleteBook(ID:ID!):String!
    }
`;
const resolvers = {
    Query: {
        async getBook(_, { ID }) {
            return await Book.findById(ID);
        },
        async getBooks(_, { limit }) {
            return await Book.find().limit(limit);
        },
        async books(_, args) {
            const { filter } = args.input;
            const { limit } = args;
            const shouldApplyFilter = filter != null;
            if (!shouldApplyFilter) {
                return await Book.find().limit(limit);
            }
            const shouldApplyIDsFilter = filter != null;
            if (!shouldApplyIDsFilter) {
                let ids = filter.ids;
                ids = ids.filter(id => Types.ObjectId.isValid(id));
                return await Book.find({ "_id": { "$in": ids } });
            }
            const shouldApplyAuthorFilter = filter.author != null;
            if (shouldApplyAuthorFilter) {
                return await Book.find({ "author": filter.author });
            }
            const shouldApplyDateRangeFilter = filter.startDate != null && filter.endDate != null;
            if (shouldApplyDateRangeFilter) {
                let startDate = filter.startDate;
                let endDate = filter.endDate;
                return await Book.find({ year: { "#gte": startDate, "lte:endDate": endDate } });
            }
        }
    },
    Mutation: {
        async createBook(_, { bookInput: { author, title, year } }) {
            const res = await new Book({ author, title, year }).save();
            return res._id;
        },
        async updateBook(_, { ID, bookInput: { author, title, year } }) {
            await Book.updateOne({ _id: ID }, { $set: { author, title, year } });
            return ID;
        },
        async deleteBook(_, { ID }) {
            await Book.findByIdAndRemove({ _id: ID });
            return ID;
        }
    }
};
await connect(MONGODB);
const server = new ApolloServer({
    typeDefs,
    resolvers
});
const port = Number.parseInt(process.env.Port) || 4000;
const { url } = await startStandaloneServer(server, {
    listen: { port: port }
});
console.log(`Server is ready at ${url}`);

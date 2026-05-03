export const ROADMAP = [
  {
    topic: "Arrays",
    summary: "Foundation — indexing, traversal, two-pointer, sliding window.",
    items: ["Two-pointer technique", "Sliding window", "Prefix sums", "Sorting fundamentals"],
  },
  {
    topic: "Strings",
    summary: "Pattern matching, hashing, classic interview problems.",
    items: ["Anagrams", "Palindromes", "KMP / Rabin-Karp basics", "Longest substring problems"],
  },
  {
    topic: "Linked Lists",
    summary: "Pointers, fast/slow, reversal patterns.",
    items: ["Reverse list", "Detect cycle", "Merge sorted lists", "LRU cache"],
  },
  {
    topic: "Stacks & Queues",
    summary: "Monotonic stacks, BFS queues, expression parsing.",
    items: ["Valid parentheses", "Next greater element", "Min stack", "Sliding window max"],
  },
  {
    topic: "Trees",
    summary: "Recursion, traversals, BST operations, balanced trees.",
    items: ["DFS / BFS", "BST insert/search", "Lowest common ancestor", "Tree diameter"],
  },
  {
    topic: "Graphs",
    summary: "DFS, BFS, shortest paths, MST, topological sort.",
    items: ["DFS/BFS", "Dijkstra", "Topological sort", "Union-Find"],
  },
  {
    topic: "Dynamic Programming",
    summary: "Memoization, tabulation, classic patterns.",
    items: ["Knapsack", "LIS / LCS", "Edit distance", "DP on trees / grids"],
  },
  {
    topic: "Greedy & Backtracking",
    summary: "Choices, exchange argument, search space pruning.",
    items: ["Activity selection", "Huffman coding", "N-Queens", "Sudoku solver"],
  },
] as const;

export const RESOURCES = [
  {
    category: "Books",
    items: [
      { name: "Cracking the Coding Interview", url: "https://www.crackingthecodinginterview.com/" },
      { name: "Elements of Programming Interviews", url: "https://elementsofprogramminginterviews.com/" },
      { name: "Introduction to Algorithms (CLRS)", url: "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/" },
    ],
  },
  {
    category: "Websites",
    items: [
      { name: "LeetCode", url: "https://leetcode.com/" },
      { name: "NeetCode", url: "https://neetcode.io/" },
      { name: "Codeforces", url: "https://codeforces.com/" },
      { name: "AlgoExpert", url: "https://www.algoexpert.io/" },
    ],
  },
  {
    category: "YouTube",
    items: [
      { name: "NeetCode", url: "https://www.youtube.com/c/NeetCode" },
      { name: "Abdul Bari (Algorithms)", url: "https://www.youtube.com/@abdul_bari" },
      { name: "Errichto", url: "https://www.youtube.com/c/Errichto" },
      { name: "freeCodeCamp", url: "https://www.youtube.com/c/Freecodecamp" },
    ],
  },
] as const;

export const PISTON_LANGUAGES = [
  { id: "python", label: "Python", version: "3.10.0", monaco: "python", starter: 'print("Hello, World!")\n' },
  { id: "javascript", label: "JavaScript", version: "18.15.0", monaco: "javascript", starter: 'console.log("Hello, World!");\n' },
  { id: "java", label: "Java", version: "15.0.2", monaco: "java", starter:
`public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, World!");
  }
}\n` },
  { id: "cpp", label: "C++", version: "10.2.0", monaco: "cpp", starter:
`#include <iostream>
using namespace std;
int main() {
  cout << "Hello, World!" << endl;
  return 0;
}\n` },
] as const;

export type LangId = (typeof PISTON_LANGUAGES)[number]["id"];

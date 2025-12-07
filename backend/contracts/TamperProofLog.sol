// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title TamperProofLog
 * @dev Smart contract for storing tamper-proof hashes on Ethereum blockchain
 * @notice This contract stores hashes of important records to ensure data integrity
 */
contract TamperProofLog {
    
    // Structure to hold record information
    struct Record {
        string hash;      // The hash of the record (from keccak256)
        uint256 time;     // Block timestamp when stored
    }

    // Counter for total records stored
    uint256 public counter;
    
    // Mapping from ID to Record
    mapping(uint256 => Record) public records;

    // Event emitted when a new hash is stored
    event Stored(uint256 indexed id, string hash, uint256 time);

    /**
     * @dev Store a new hash on the blockchain
     * @param _hash The hash string to store (0x-prefixed hex string)
     * @return The ID of the newly stored record
     */
    function store(string calldata _hash) external returns (uint256) {
        counter++;
        records[counter] = Record(_hash, block.timestamp);
        emit Stored(counter, _hash, block.timestamp);
        return counter;
    }

    /**
     * @dev Retrieve a stored record by ID
     * @param id The ID of the record to retrieve
     * @return hash The stored hash
     * @return time The timestamp when it was stored
     */
    function get(uint256 id) external view returns (string memory, uint256) {
        Record memory r = records[id];
        require(bytes(r.hash).length > 0, "Record does not exist");
        return (r.hash, r.time);
    }

    /**
     * @dev Get total number of records stored
     * @return The current counter value
     */
    function getTotalRecords() external view returns (uint256) {
        return counter;
    }
}
